(function() {
  'use strict';

  const drawSvgElement = (element, ctx) => {
    if (!ctx) ctx = anbt.ctx;
    ctx.globalCompositeOperation =
      element.getAttribute('class') === 'eraser'
        ? 'destination-out'
        : 'source-over';
    if (element.nodeName === 'path') {
      ctx.strokeStyle = element.getAttribute('stroke');
      ctx.lineWidth = element.getAttribute('stroke-width');
      ctx.beginPath();
      for (let i = 0; i < element.pathSegList.numberOfItems; i++) {
        const seg = element.pathSegList.getItem(i);
        if (seg.pathSegTypeAsLetter === 'M') ctx.moveTo(seg.x, seg.y);
        else if (seg.pathSegTypeAsLetter === 'L') ctx.lineTo(seg.x, seg.y);
        else if (seg.pathSegTypeAsLetter === 'Q')
          ctx.quadraticCurveTo(seg.x1, seg.y1, seg.x, seg.y);
        else if (seg.pathSegTypeAsLetter === 'C')
          ctx.bezierCurveTo(seg.x1, seg.y1, seg.x2, seg.y2, seg.x, seg.y);
      }
      ctx.stroke();
    } else if (element.nodeName === 'rect') {
      ctx.fillStyle = element.getAttribute('fill');
      const x = element.getAttribute('x');
      const y = element.getAttribute('y');
      const width = element.getAttribute('width');
      const height = element.getAttribute('height');
      ctx.fillRect(x, y, width, height);
    }
  };

  const moveSeekbar = position => {
    if (anbt.seekbarMove) anbt.seekbarMove(position);
  };

  const addToSvg = element => {
    if (anbt.rewindCache.length >= anbt.fastUndoLevels) anbt.rewindCache.pop();
    anbt.rewindCache.unshift(anbt.ctx.getImageData(0, 0, 600, 500));
    drawSvgElement(element);
    if (!anbt.timeedit || anbt.position === anbt.svg.childNodes.length - 1) {
      for (let i = anbt.svg.childNodes.length - 1; i > anbt.position; i--)
        anbt.svg.removeChild(anbt.svg.childNodes[i]);
      anbt.svg.appendChild(element);
      anbt.position = anbt.svg.childNodes.length - 1;
      moveSeekbar(1);
    } else
      anbt.svg.insertBefore(element, anbt.svg.childNodes[anbt.position + 1]);
  };

  const createSvgElement = (name, attributs) => {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      name
    );
    if (attributs)
      Object.keys(attributs).forEach(attribut => {
        if (attributs[attribut])
          element.setAttribute(attribut, attributs[attribut]);
      });
    return element;
  };

  const bindContainer = element => {
    anbt.container = element;
    anbt.canvas.width = 600;
    anbt.canvas.height = 500;
    anbt.canvas.style.background = anbt.background;
    anbt.ctx = anbt.canvas.getContext('2d');
    anbt.ctx.lineJoin = anbt.ctx.lineCap = 'round';
    anbt.container.appendChild(anbt.canvas);
    if (!navigator.userAgent.match(/\bPresto\b/)) {
      anbt.canvasDisp.width = 600;
      anbt.canvasDisp.height = 500;
      anbt.ctxDisp = anbt.canvasDisp.getContext('2d');
      anbt.ctxDisp.lineJoin = anbt.ctxDisp.lineCap = 'round';
      anbt.container.appendChild(anbt.canvasDisp);
    } else anbt.DrawDispLine = anbt.DrawDispLinePresto;
    anbt.container.appendChild(anbt.svgDisp);
    const rect = createSvgElement('rect', {
      class: 'eraser',
      x: 0,
      y: 0,
      width: 600,
      height: 500,
      fill: anbt.background
    });
    anbt.svg.appendChild(rect);
  };

  const clearWithColor = color => {
    addToSvg(
      createSvgElement('rect', {
        class: color,
        x: 0,
        y: 0,
        width: 600,
        height: 500,
        fill: anbt.background
      })
    );
    anbt.lastrect = anbt.position;
  };

  const cutHistoryBeforeClearAndAfterPosition = () => {
    let removing = false;
    for (let i = anbt.svg.childNodes.length - 1; i > 0; i--) {
      const element = anbt.svg.childNodes[i];
      if (removing || i > anbt.position) anbt.svg.removeChild(element);
      else if (element.nodeName === 'rect' && i <= anbt.position) {
        removing = true;
        if (element.getAttribute('class') === 'eraser')
          anbt.svg.removeChild(element);
      }
    }
  };

  const drawDispLine = (x1, y1, x2, y2) => {
    const { ctxDisp } = anbt;
    ctxDisp.strokeStyle = anbt.lastcolor;
    ctxDisp.lineWidth = anbt.size;
    ctxDisp.beginPath();
    ctxDisp.moveTo(x1, y1);
    ctxDisp.lineTo(x2, y2);
    ctxDisp.stroke();
  };

  const drawDispLinePresto = first => {
    if (first) anbt.svgDisp.insertBefore(anbt.path, anbt.svgDisp.firstChild);
  };

  const colorToRgba = color =>
    color[0] === '#'
      ? color.length === 4
        ? [...(color.substr(1, 3) + 'F')].map(rgb => parseInt(rgb + rgb, 16))
        : (color + 'FF')
            .substr(1, 8)
            .match(/.{2}/g)
            .map(rgb => parseInt(rgb, 16))
      : color.substr(0, 4) === 'rgba'
      ? color
          .match(/[\d\.]+/g)
          .map((rgba, index) =>
            index === 3
              ? Math.floor(parseFloat(rgba) * 255)
              : parseInt(rgba, 10)
          )
      : color.substr(0, 3) === 'rgb'
      ? (color + 255).match(/[\d\.]+/g).map(rgba => parseInt(rgba, 10))
      : [0, 0, 0, 255];

  const rgbToHex = rgb =>
    '#' +
    rgb
      .map((value, index) =>
        index < 3 ? ('0' + value.toString(16)).slice(-2) : ''
      )
      .join('');

  const colorToHex = color => rgbToHex(colorToRgba(color));

  const rgbToLab = rgb => {
    const [r, g, b] = rgb.map(value =>
      value > 10
        ? Math.pow((value / 255 + 0.055) / 1.055, 2.4)
        : value / 255 / 12.92
    );
    const [x, y, z] = [
      (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
      r * 0.2126 + g * 0.7152 + b * 0.0722,
      (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    ].map(value =>
      value > 0.008856 ? Math.pow(value, 1 / 3) : 7.787 * value + 16 / 116
    );
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };

  const getColorDistance = (rgb1, rgb2) => {
    const lab1 = rgbToLab(rgb1);
    const lab2 = rgbToLab(rgb2);
    const l = lab2[0] - lab1[0];
    const a = lab2[1] - lab1[1];
    const b = lab2[2] - lab1[2];
    return Math.sqrt(l ** 2 * 2 + a ** 2 + b ** 2);
  };

  const ID = id => document.getElementById(id);

  const getClosestColor = (rgb, palette) => {
    if (
      ID('newcanvasyo').classList.contains('sandbox') ||
      (window.gameInfo && window.gameInfo.friend)
    )
      return rgbToHex([...rgb]);
    const distances = palette
      .slice(0)
      .map(color => getColorDistance([...rgb], colorToRgba(color)));
    const minimum = Math.min(...distances);
    const closestColor = palette[distances.indexOf(minimum)];
    return colorToHex(closestColor);
  };

  const eyedropper = (x, y) => {
    const pixelColor = anbt.ctx.getImageData(x, y, 1, 1).data;
    return pixelColor[3] > 0
      ? getClosestColor(pixelColor, anbt.palette)
      : anbt.background;
  };

  const findLastRect = endPosition => {
    if (!endPosition) endPosition = anbt.svg.childNodes.length - 1;
    for (let i = endPosition; i > 0; i--) {
      const element = anbt.svg.childNodes[i];
      if (element.nodeName === 'rect') return i;
    }
    return 0;
  };

  const packUint32be = number =>
    String.fromCharCode(
      (number >> 24) & 0xff,
      (number >> 16) & 0xff,
      (number >> 8) & 0xff,
      number & 0xff
    );

  const setBackground = color => {
    const transparent = color === 'eraser';
    anbt.transparent = transparent;
    anbt.canvas.style.background = transparent ? 'none' : color;
    color = transparent ? '#ffffff' : colorToHex(color);
    anbt.background = color;
    anbt.svg
      .querySelectorAll('.eraser')
      .forEach(erased =>
        erased.setAttribute(
          erased.nodeName === 'path' ? 'stroke' : 'fill',
          color
        )
      );
  };

  const buildSmoothPath = (points, path) => {
    const { length } = points;
    if (length < 2) return;
    path.pathSegList.initialize(
      path.createSVGPathSegMovetoAbs(points[0].x, points[0].y)
    );
    if (!window.options.smoothening) {
      for (let i = 1; i < points.length; i++)
        path.pathSegList.appendItem(
          path.createSVGPathSegLinetoAbs(points[i].x, points[i].y)
        );
      return;
    }
    path.pathSegList.appendItem(
      path.createSVGPathSegLinetoAbs(points[1].x, points[1].y)
    );
    if (length < 3) return;
    let prevtangent;
    for (let i = 1; i < length - 1; i++) {
      const previousPoint = points[i - 1];
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      const dx1 = currentPoint.x - previousPoint.x;
      const dy1 = currentPoint.y - previousPoint.y;
      const angle1 = Math.atan2(dy1, dx1);
      const dist1 = Math.sqrt(dx1 ** 2 + dy1 ** 2);
      const dx2 = nextPoint.x - currentPoint.x;
      const dy2 = nextPoint.y - currentPoint.y;
      const angle2 = Math.atan2(dy2, dx2);
      const dist2 = Math.sqrt(dx2 ** 2 + dy2 ** 2);
      const tangent = (angle1 + angle2) / 2;
      if (i > 1) {
        let good = false;
        if (Math.abs(angle2 - angle1) >= Math.PI / 4) {
          path.pathSegList.appendItem(
            path.createSVGPathSegLinetoAbs(currentPoint.x, currentPoint.y)
          );
        } else {
          if (good && dist1 / dist2 >= 0.4 && dist1 / dist2 <= 2.5) {
            const t1 = {
              x: previousPoint.x + Math.cos(prevtangent) * dist1 * 0.4,
              y: previousPoint.y + Math.sin(prevtangent) * dist1 * 0.4
            };
            const t2 = {
              x: currentPoint.x - Math.cos(tangent) * dist2 * 0.4,
              y: currentPoint.y - Math.sin(tangent) * dist2 * 0.4
            };
            path.pathSegList.appendItem(
              path.createSVGPathSegCurvetoCubicAbs(
                currentPoint.x,
                currentPoint.y,
                t1.x,
                t1.y,
                t2.x,
                t2.y
              )
            );
          } else {
            path.pathSegList.appendItem(
              path.createSVGPathSegLinetoAbs(currentPoint.x, currentPoint.y)
            );
            good = true;
          }
        }
      }
      prevtangent = tangent;
    }
    const c = points[length - 1];
    path.pathSegList.appendItem(path.createSVGPathSegLinetoAbs(c.x, c.y));
  };

  const stringToBytes = binaryString =>
    new Uint8Array([...binaryString].map(character => character.charCodeAt(0)));

  const int16be = (byte1, byte2) => {
    const v = (byte1 << 8) | byte2;
    return v > 32767 ? v - 65536 : v;
  };

  const unpackPlayback = bytes => {
    const { pako } = window;
    const version = bytes[0];
    let start;
    if (version === 4) {
      bytes = pako.inflate(bytes.subarray(1));
      start = 0;
    } else if (version === 3) {
      bytes = stringToBytes(pako.inflate(bytes.subarray(1), { to: 'string' }));
      start = 0;
    } else if (version === 2) start = 1;
    else throw new Error(`Unsupported version: ${version}`);
    const svg = createSvgElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      version: '1.1',
      width: 600,
      height: 500
    });
    const last = {
      color: '#000000',
      size: 14,
      x: 0,
      y: 0,
      pattern: 0
    };
    let points = [];
    const background = `rgb(${bytes[start]}, ${bytes[start + 1]}, ${
      bytes[start + 2]
    })`;
    svg.background = background;
    svg.appendChild(
      createSvgElement('rect', {
        class: 'eraser',
        x: 0,
        y: 0,
        width: 600,
        height: 500,
        fill: background
      })
    );
    for (let i = start + 4; i < bytes.length; ) {
      let x = int16be(bytes[i], bytes[i + 1]);
      i += 2;
      let y = int16be(bytes[i], bytes[i + 1]);
      i += 2;
      if (points.length) {
        if (!x && !y) {
          const path = createSvgElement('path', {
            class: last.color === 'eraser' ? last.color : null,
            stroke: last.color === 'eraser' ? background : last.color,
            'stroke-width': last.size,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            fill: 'none'
          });
          if (points.length === 1) {
            path.pathSegList.appendItem(
              path.createSVGPathSegMovetoAbs(last.x, last.y)
            );
            path.pathSegList.appendItem(
              path.createSVGPathSegLinetoAbs(last.x, last.y + 0.001)
            );
          } else buildSmoothPath(points, path);
          path.orig = points;
          path.pattern = last.pattern;
          svg.appendChild(path);
          points = [];
        } else {
          last.x = x += last.x;
          last.y = y += last.y;
          points.push({ x, y });
        }
      } else {
        if (x < 0) {
          if (x === -1 || x === -2) {
            last.color = `rgba(${bytes[i]}, ${bytes[i + 1]}, ${
              bytes[i + 2]
            }, ${bytes[i + 3] / 255}`;
            if (last.color === 'rgba(255,255,255,0)') last.color = 'eraser';
            i += 4;
            if (x === -1) last.size = y / 100;
            else
              svg.appendChild(
                createSvgElement('rect', {
                  class: last.color === 'eraser' ? last.color : null,
                  x: 0,
                  y: 0,
                  width: 600,
                  height: 500,
                  fill: last.color === 'eraser' ? background : last.color
                })
              );
          } else if (x === -3) {
            last.pattern = y;
            i += 4;
          }
        } else {
          points.push({ x, y });
          last.x = x;
          last.y = y;
        }
      }
    }
    return svg;
  };

  const updateView = () =>
    [...anbt.svg.childNodes]
      .splice(anbt.lastrect < anbt.position ? anbt.lastrect : 0)
      .forEach(child => drawSvgElement(child));

  const fromPng = buffer => {
    const dv = new DataView(buffer);
    const magic = dv.getUint32(0);
    if (magic !== 0x89504e47)
      throw new Error(`Invalid PNG format: ${packUint32be(magic)}`);
    for (let i = 8; i < buffer.byteLength; i += 4) {
      const chunklen = dv.getUint32(i);
      i += 4;
      const chunkname = packUint32be(dv.getUint32(i));
      i += 4;
      if (chunkname === 'svGb') {
        anbt.svg = unpackPlayback(new Uint8Array(buffer, i, chunklen));
        anbt.lastrect = 0;
        anbt.rewindCache.length = 0;
        anbt.position = anbt.svg.childNodes.length - 1;
        updateView();
        moveSeekbar(1);
        setBackground(anbt.svg.background);
        return;
      } else {
        if (chunkname === 'IEND') break;
        i += chunklen;
      }
    }
    throw new Error('No vector data found!');
  };

  const fromLocalFile = () => {
    if (!anbt.fileInput) {
      anbt.fileInput = document.createElement('input');
      anbt.fileInput.style.position = 'absolute';
      anbt.fileInput.style.top = '-1000px';
      anbt.fileInput.type = 'file';
      anbt.fileInput.accept = '.png';
      document.body.appendChild(anbt.fileInput);
      anbt.fileInput.addEventListener(
        'change',
        event => {
          const reader = new FileReader();
          reader.onload = () => fromPng(reader.result);
          if (event.currentTarget.files[0])
            reader.readAsArrayBuffer(event.currentTarget.files[0]);
        },
        false
      );
    }
    anbt.fileInput.click();
  };

  const fromUrl = url => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if ('responseType' in xhr) xhr.responseType = 'arraybuffer';
    else return alert('Your browser is too old for this');
    xhr.onload = () => fromPng(xhr.response);
    xhr.send();
  };

  const getSeekMax = () => anbt.svg.childNodes.length - 1;

  const moveCursor = (x, y) => {
    if (anbt.locked) return;
    if (!anbt.brushCursor) {
      anbt.brushCursor = createSvgElement('circle', {
        'stroke-width': '1',
        stroke: '#000',
        fill: 'none'
      });
      anbt.svgDisp.appendChild(anbt.brushCursor);
      anbt.brushCursor2 = createSvgElement('circle', {
        'stroke-width': '1',
        stroke: '#fff',
        fill: 'none'
      });
      anbt.svgDisp.appendChild(anbt.brushCursor2);
      anbt.eyedropperCursor = createSvgElement('image', {
        width: 16,
        height: 16,
        visibility: 'hidden'
      });
      anbt.eyedropperCursor.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAARklEQVR4XoXRwQoAIAgEUf//pzeGDgq5G3PrCQqVbIAqsDz9WM2qhTX4GZgPV+JpSFxAC0PwbeVZZIpMgXvAMwoj4U9B3wGySxvzk6ZjvwAAAABJRU5ErkJggg=='
      );
      anbt.svgDisp.appendChild(anbt.eyedropperCursor);
    }
    if (typeof x !== 'undefined') {
      anbt.brushCursor.setAttribute('cx', x);
      anbt.brushCursor.setAttribute('cy', y);
      anbt.brushCursor2.setAttribute('cx', x);
      anbt.brushCursor2.setAttribute('cy', y);
      anbt.eyedropperCursor.setAttribute('x', x - 1);
      anbt.eyedropperCursor.setAttribute('y', y - 15);
    }
    anbt.brushCursor.setAttribute('r', anbt.size / 2 + 0.5);
    anbt.brushCursor2.setAttribute('r', anbt.size / 2 - 0.5);
  };

  const getSqSegDist = (point, point1, point2) => {
    let { x, y } = point1;
    let dx = point2.x - x;
    let dy = point2.y - y;
    if (dx !== 0 || dy !== 0) {
      var t = ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = point2.x;
        y = point2.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = point.x - x;
    dy = point.y - y;
    return dx * dx + dy * dy;
  };

  const simplifyDouglasPeucker = ({ points, smoothening: sqTolerance }) => {
    const length = points.length;
    const MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    const markers = new MarkerArray(length);
    let first = 0;
    let last = length - 1;
    const stack = [];
    const newPoints = [];
    markers[first] = markers[last] = 1;
    while (last) {
      let maxSqDist = 0;
      let index;
      for (let i = first + 1; i < last; i++) {
        let sqDist = getSqSegDist(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (maxSqDist > sqTolerance) {
        markers[index] = 1;
        stack.push(first, index, index, last);
      }
      last = stack.pop();
      first = stack.pop();
    }
    for (let i = 0; i < length; i++) if (markers[i]) newPoints.push(points[i]);
    return newPoints;
  };

  const strokeEnd = () => {
    if (anbt.locked) return;
    anbt.unsaved = true;
    const points =
      anbt.points.length > 2 ? simplifyDouglasPeucker(anbt) : anbt.points;
    buildSmoothPath(points, anbt.path);
    anbt.path.orig = points;
    addToSvg(anbt.path);
    anbt.ctxDisp && anbt.ctxDisp.clearRect(0, 0, 600, 500);
    anbt.isStroking = false;
  };

  const lock = () => {
    if (anbt.isStroking) strokeEnd();
    anbt.locked = true;
    moveCursor(-100, -100);
  };

  const makeCRCTable = () => {
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable.push(c);
    }
    return crcTable;
  };

  const crc32 = (string, string2) => {
    const crcTable = makeCRCTable();
    let crc = -1;
    for (let i = 0; i < string.length; i++)
      crc = (crc >>> 8) ^ crcTable[(crc ^ string.charCodeAt(i)) & 0xff];
    if (string2) {
      for (let i = 0; i < string2.length; i++)
        crc = (crc >>> 8) ^ crcTable[(crc ^ string2.charCodeAt(i)) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  const bytesToString = bytes =>
    [...bytes].map(byte => String.fromCharCode(byte)).join('');

  const colorToDword = color =>
    colorToRgba(color)
      .map(value => String.fromCharCode(value))
      .join('');

  const packUint16be = number =>
    String.fromCharCode((number >> 8) & 0xff, number & 0xff);

  const packPlayback = svg => {
    const { pako } = window;
    const array = [colorToDword(anbt.background)];
    const last = {
      color: colorToDword('#000000'),
      size: 14,
      x: -1,
      y: -1,
      pattern: 0
    };
    svg.childNodes.forEach(element => {
      if (element.nodeName === 'path') {
        const color =
          element.getAttribute('class') === 'eraser'
            ? '\xFF\xFF\xFF\x00'
            : colorToDword(element.getAttribute('stroke'));
        const size = element.getAttribute('stroke-width');
        const pattern = element.pattern || 0;
        if (color !== last.color || size !== last.size) {
          array.push(packUint16be(-1));
          array.push(packUint16be(size * 100));
          array.push(color);
          last.color = color;
          last.size = size;
        }
        if (pattern !== last.pattern) {
          array.push(packUint16be(-3));
          array.push(packUint16be(pattern));
          array.push('\x00\x00\x00\x00');
          last.pattern = pattern;
        }
        last.x = element.orig[0].x;
        last.y = element.orig[0].y;
        array.push(packUint16be(last.x));
        array.push(packUint16be(last.y));
        for (let j = 1; j < element.orig.length; j++) {
          const dx = element.orig[j].x - last.x;
          const dy = element.orig[j].y - last.y;
          if (!dx && !dy) continue;
          array.push(packUint16be(dx));
          array.push(packUint16be(dy));
          last.x = element.orig[j].x;
          last.y = element.orig[j].y;
        }
        array.push('\x00\x00\x00\x00');
      } else if (element.nodeName === 'rect') {
        const color = colorToDword(element.getAttribute('fill'));
        array.push(packUint16be(-2));
        array.push(packUint16be(0));
        array.push(color);
      } else throw new Error('Unknown node name: ' + element.nodeName);
    });
    return '\x04' + bytesToString(pako.deflate(stringToBytes(array.join(''))));
  };

  const makePng = (width, height, fromBuffer) => {
    cutHistoryBeforeClearAndAfterPosition();
    moveSeekbar(1);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!anbt.transparent) {
      context.fillStyle = anbt.background;
      context.fillRect(0, 0, width, height);
    }
    if (fromBuffer) context.drawImage(anbt.canvas, 0, 0, width, height);
    else {
      context.lineJoin = context.lineCap = 'round';
      context.scale(width / 600, height / 500);
      for (let i = 0; i < anbt.svg.childNodes.length; i++) {
        drawSvgElement(anbt.svg.childNodes[i], context);
      }
    }
    anbt.pngBase64 = canvas.toDataURL('image/png');
    const version = 'svGb';
    const svgString = packPlayback(anbt.svg);
    const padding = anbt.pngBase64.substr(-2);
    const cut = padding === '==' ? 1 : padding[1] === '=' ? 2 : 3;
    const indexEnd = atob(anbt.pngBase64.substr(-20)).substr(cut);
    const prepend = atob(anbt.pngBase64.substr(-20)).substr(0, cut);
    const custom = [
      prepend,
      packUint32be(svgString.length),
      version,
      svgString,
      packUint32be(crc32(version, svgString)),
      indexEnd
    ].join('');
    anbt.pngBase64 =
      anbt.pngBase64.substr(0, anbt.pngBase64.length - 20) + btoa(custom);
  };

  const pause = noSeekbar => {
    if (anbt.isPlaying) {
      if (anbt.isAnimating) {
        anbt.isAnimating = false;
        anbt.svgDisp.removeChild(anbt.path);
        drawSvgElement(anbt.animatePath);
        anbt.position++;
        if (!noSeekbar)
          moveSeekbar(anbt.position / (anbt.svg.childNodes.length - 1));
      }
      anbt.isPlaying = false;
    }
  };

  const playTimer = () => {
    if (!anbt.isPlaying) return;
    const posmax = anbt.svg.childNodes.length - 1;
    let { delay } = anbt;
    let maxidx = 0;
    if (anbt.position < posmax || anbt.isAnimating) {
      if (anbt.isAnimating) {
        maxidx = anbt.animatePath.pathSegList.numberOfItems - 1;
        if (anbt.animateIndex < maxidx) {
          const segment = anbt.animatePath.pathSegList.getItem(
            anbt.animateIndex
          );
          const newSegment =
            segment.pathSegTypeAsLetter === 'L'
              ? anbt.path.createSVGPathSegLinetoAbs(segment.x, segment.y)
              : segment.pathSegTypeAsLetter === 'Q'
              ? anbt.path.createSVGPathSegCurvetoQuadraticAbs(
                  segment.x,
                  segment.y,
                  segment.x1,
                  segment.y1
                )
              : segment.pathSegTypeAsLetter === 'C' &&
                anbt.path.createSVGPathSegCurvetoCubicAbs(
                  segment.x,
                  segment.y,
                  segment.x1,
                  segment.y1,
                  segment.x2,
                  segment.y2
                );
          anbt.path.pathSegList.appendItem(newSegment);
          anbt.animateIndex++;
        } else {
          anbt.isAnimating = false;
          anbt.svgDisp.removeChild(anbt.path);
          drawSvgElement(anbt.animatePath);
          anbt.position++;
          anbt.animateIndex = 0;
        }
        delay /= 6;
      } else {
        const element = anbt.svg.childNodes[anbt.position + 1];
        if (element.nodeName === 'path') {
          anbt.isAnimating = true;
          anbt.animatePath = element;
          anbt.animateIndex = 1;
          anbt.path = element.cloneNode(true);
          const segment = element.pathSegList.getItem(0);
          anbt.path.pathSegList.initialize(
            anbt.path.createSVGPathSegMovetoAbs(segment.x, segment.y)
          );
          anbt.svgDisp.insertBefore(anbt.path, anbt.svgDisp.firstChild);
        } else {
          drawSvgElement(element);
          anbt.position++;
        }
      }
    }
    moveSeekbar(
      (anbt.position + (maxidx ? anbt.animateIndex / maxidx : 0)) / posmax
    );
    if (anbt.position < posmax) setTimeout(anbt.playTimer, delay);
    else pause();
  };

  const play = () => {
    if (anbt.locked) return;
    anbt.rewindCache.length = 0;
    if (anbt.position === anbt.svg.childNodes.length - 1) {
      if (anbt.position === 0) return moveSeekbar(1);
      anbt.position = 0;
      moveSeekbar(0);
      drawSvgElement(anbt.svg.childNodes[0]);
    }
    anbt.isPlaying = true;
    playTimer();
  };

  const seek = newPosition => {
    if (anbt.locked) return;
    let start = -1;
    pause(true);
    if (newPosition === anbt.position) return;
    if (newPosition < anbt.position) {
      const rewindSteps = anbt.position - newPosition;
      if (rewindSteps <= anbt.rewindCache.length) {
        anbt.ctx.putImageData(anbt.rewindCache[rewindSteps - 1], 0, 0);
        anbt.rewindCache.splice(0, rewindSteps);
      } else {
        start = 0;
        if (anbt.lastrect <= newPosition) start = anbt.lastrect;
        else start = findLastRect(newPosition);
        drawSvgElement(anbt.svg.childNodes[start]);
      }
    } else if (newPosition > anbt.position) start = anbt.position;
    if (start !== -1) {
      const forwardSteps = newPosition - start;
      if (forwardSteps >= anbt.fastUndoLevels) anbt.rewindCache.length = 0;
      else {
        const { length } = anbt.rewindCache;
        const numRemove = Math.min(
          length,
          newPosition - start + length - anbt.fastUndoLevels
        );
        anbt.rewindCache.splice(length - numRemove, numRemove);
      }
      for (let i = start + 1; i <= newPosition; i++) {
        if (newPosition - i < anbt.fastUndoLevels)
          anbt.rewindCache.unshift(anbt.ctx.getImageData(0, 0, 600, 500));
        drawSvgElement(anbt.svg.childNodes[i]);
      }
    }
    anbt.position = newPosition;
  };

  const redo = () => {
    if (anbt.locked) return;
    var posmax = anbt.svg.childNodes.length - 1;
    if (anbt.position < posmax) {
      seek(anbt.position + 1);
      moveSeekbar(anbt.position / posmax);
    }
  };

  const requestSave = (dataUrl, extension) => {
    if (!dataUrl) {
      dataUrl = anbt.pngBase64;
      extension = '.png';
      anbt.unsaved = false;
    }
    if (!anbt.saveLink) {
      anbt.saveLink = document.createElement('a');
      document.body.appendChild(anbt.saveLink);
    }
    if ('download' in anbt.saveLink) {
      anbt.saveLink.href = dataUrl;
      const date = new Date();
      anbt.saveLink.download = [
        'DrawingInTime_',
        date.getFullYear(),
        '_',
        (101 + date.getMonth() + '').slice(-2),
        (100 + date.getDate() + '').slice(-2),
        '_',
        (100 + date.getHours() + '').slice(-2),
        (100 + date.getMinutes() + '').slice(-2),
        (100 + date.getSeconds() + '').slice(-2),
        extension
      ].join('');
      anbt.saveLink.click();
    } else window.open(dataUrl);
    return true;
  };

  const setColor = (number, color) => (anbt.colors[number] = color);

  const setSeekbarMove = func => (anbt.seekbarMove = func);

  const setSize = size => {
    anbt.size = size;
    moveCursor();
  };

  const showEyedropperCursor = isEyedropper => {
    if (!anbt.brushCursor) return;
    const vis = isEyedropper ? 'hidden' : 'visible';
    const vis2 = isEyedropper ? 'visible' : 'hidden';
    anbt.brushCursor.setAttribute('visibility', vis);
    anbt.brushCursor2.setAttribute('visibility', vis);
    anbt.eyedropperCursor.setAttribute('visibility', vis2);
  };

  const strokeAdd = (x, y) => {
    if (anbt.locked) return;
    if (!anbt.isStroking) throw new Error('StrokeAdd without StrokeBegin!');
    const point = anbt.points[anbt.points.length - 1];
    if (point.x === x && point.y === y) return;
    if (anbt.blot) {
      anbt.path.pathSegList.removeItem(1);
      anbt.blot = false;
    }
    anbt.path.pathSegList.appendItem(anbt.path.createSVGPathSegLinetoAbs(x, y));
    if (navigator.userAgent.match(/\bPresto\b/)) drawDispLinePresto(false);
    else drawDispLine(point.x, point.y, x, y);
    anbt.points.push({ x, y });
  };

  const strokeBegin = (x, y, left) => {
    if (anbt.locked) return;
    if (!left) left = anbt.lastleft;
    else anbt.lastleft = left;
    let color = left ? anbt.colors[0] : anbt.colors[1];
    const cls = color === 'eraser' ? color : null;
    color = color === 'eraser' ? anbt.background : color;
    anbt.path = createSvgElement('path', {
      class: cls,
      stroke: color,
      'stroke-width': anbt.size,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      fill: 'none'
    });
    anbt.lastcolor = color;
    anbt.path.pattern = anbt.pattern;
    anbt.path.pathSegList.appendItem(anbt.path.createSVGPathSegMovetoAbs(x, y));
    anbt.path.pathSegList.appendItem(
      anbt.path.createSVGPathSegLinetoAbs(x, y + 0.001)
    );
    if (navigator.userAgent.match(/\bPresto\b/)) drawDispLinePresto(true);
    else drawDispLine(x, y, x, y + 0.001);
    anbt.points = [];
    anbt.points.push({ x, y });
    anbt.blot = true;
    anbt.isStroking = true;
  };

  const undo = () => {
    if (anbt.locked) return;
    if (anbt.position > 0) {
      seek(anbt.position - 1);
      moveSeekbar(anbt.position / (anbt.svg.childNodes.length - 1));
    }
  };

  const unlock = () => (anbt.locked = false);

  const base64ToBytes = base64 => stringToBytes(atob(base64));

  const uploadToImgur = callback => {
    const request = new XMLHttpRequest();
    request.open('POST', 'https://api.imgur.com/3/image');
    request.onload = () => {
      let response = request.responseText;
      try {
        response = JSON.parse(response);
      } catch (e) {}
      if (response.success) {
        const request2 = new XMLHttpRequest();
        request2.open(
          'POST',
          'https://api.imgur.com/3/image/' + response.data.deletehash
        );
        request2.setRequestHeader('Authorization', 'Client-ID 4809db83c8897af');
        const formData = new FormData();
        formData.append(
          'description',
          'Playback: http://grompe.org.ru/drawit/#' + response.data.id
        );
        request2.send(formData);
      }
      callback(response);
    };
    request.onerror = error => callback(`error: ${error}`);
    request.setRequestHeader('Authorization', 'Client-ID 4809db83c8897af');
    const formData = new FormData();
    formData.append(
      'image',
      new Blob([base64ToBytes(anbt.pngBase64.substr(22)).buffer], {
        type: 'image/png'
      })
    );
    formData.append('type', 'file');
    formData.append('title', 'Made with Drawing in Time');
    formData.append('description', 'http://grompe.org.ru/drawit/');
    request.send(formData);
  };

  const palettes = {
    Normal: [
      '#000000',
      '#444444',
      '#999999',
      '#ffffff',
      '#603913',
      '#c69c6d',
      '#ffdab9',
      '#ff0000',
      '#ffd700',
      '#ff6600',
      '#16ff00',
      '#0fad00',
      '#00ffff',
      '#0247fe',
      '#ec008c',
      '#8601af',
      '#fffdc9'
    ],
    Sepia: [
      '#402305',
      '#503315',
      '#604325',
      '#705335',
      '#806345',
      '#907355',
      '#a08365',
      '#b09375',
      '#bfa284',
      '#cfb294',
      '#dfc2a4',
      '#ffe2c4'
    ],
    Grayscale: [
      '#000000',
      '#ffffff',
      '#151515',
      '#2a2a2a',
      '#3f3f3f',
      '#555555',
      '#6a6a6a',
      '#7f7f7f',
      '#949494',
      '#aaaaaa',
      '#bfbfbf',
      '#d4d4d4',
      '#e9e9e9'
    ],
    'Black and white': ['#ffffff', '#000000'],
    CGA: [
      '#555555',
      '#000000',
      '#0000aa',
      '#5555ff',
      '#00aa00',
      '#55ff55',
      '#00aaaa',
      '#55ffff',
      '#aa0000',
      '#ff5555',
      '#aa00aa',
      '#ff55ff',
      '#aa5500',
      '#ffff55',
      '#aaaaaa',
      '#ffffff'
    ],
    Gameboy: ['#8bac0f', '#9bbc0f', '#306230', '#0f380f'],
    Neon: [
      '#ffffff',
      '#000000',
      '#adfd09',
      '#f3f315',
      '#feac09',
      '#fe0bab',
      '#ad0bfb',
      '#00abff'
    ],
    Thanksgiving: [
      '#673718',
      '#3c2d27',
      '#c23322',
      '#850005',
      '#c67200',
      '#77785b',
      '#5e6524',
      '#cfb178',
      '#f5e9ce'
    ],
    Holiday_old: [
      '#3d9949',
      '#7bbd82',
      '#7d1a0c',
      '#bf2a23',
      '#fdd017',
      '#00b7f1',
      '#bababa',
      '#ffffff'
    ],
    "Valentine's": [
      '#2d1014',
      '#ffffff',
      '#600d17',
      '#c2113a',
      '#b71d1d',
      '#e54d5a',
      '#ff7d63',
      '#fd8647',
      '#fed067',
      '#ffe4b7',
      '#fdc0c6'
    ],
    Halloween: [
      '#444444',
      '#000000',
      '#999999',
      '#ffffff',
      '#603913',
      '#c69c6d',
      '#7a0e0e',
      '#b40528',
      '#fd2119',
      '#fa5b11',
      '#faa611',
      '#ffd700',
      '#602749',
      '#724b97',
      '#bef202',
      '#519548',
      '#b2bb1e'
    ],
    'the blues': [
      '#b6cbe4',
      '#618abc',
      '#d0d5ce',
      '#82a2a1',
      '#92b8c1',
      '#607884',
      '#c19292',
      '#8c2c2c',
      '#295c6f'
    ],
    Spring: [
      '#9ed396',
      '#57b947',
      '#4d7736',
      '#365431',
      '#231302',
      '#3e2409',
      '#a66621',
      '#a67e21',
      '#ebbb49',
      '#ffc0cb',
      '#ffffff'
    ],
    Beach: [
      '#1ca4d2',
      '#65bbe2',
      '#6ab7bf',
      '#94cbda',
      '#9cbf80',
      '#d2e1ab',
      '#b8a593',
      '#d7cfb9',
      '#dc863e',
      '#f7dca2'
    ],
    'Tide Pool': [
      '#ffe8b9',
      '#fad489',
      '#ffb44c',
      '#d6b1de',
      '#b197a8',
      '#e5f2ff',
      '#a1ffb8',
      '#53e6ef',
      '#3ad3a8',
      '#1ca4d2',
      '#2271a2'
    ],
    'Colors of 2016': [
      '#91a7d0',
      '#f6cac9',
      '#eb9587',
      '#776a5f',
      '#d1c2ab',
      '#a39d9d',
      '#648589'
    ],
    Bee: ['#000000', '#7a5c00', '#b58800', '#eab618', '#f6de97', '#ffffff'],
    'Colors of 2017': [
      '#86af49',
      '#44883d',
      '#1f4478',
      '#0062a3',
      '#00939a',
      '#59c9d5',
      '#8a9a9a',
      '#5f7278'
    ],
    'Fire and Ice': [
      '#520909',
      '#b40528',
      '#fd2119',
      '#faa611',
      '#ffe96a',
      '#ffffff',
      '#69ddff',
      '#1c8ae5',
      '#0a3fa9',
      '#040526'
    ],
    'Canyon Sunset': [
      '#fce3ca',
      '#feb789',
      '#f27c8a',
      '#af5081',
      '#8e6dae',
      '#5f4a8b',
      '#2e1b50'
    ],
    Juice: [
      '#f3ab54',
      '#ec5e66',
      '#ab5871',
      '#f2a19b',
      '#f9f4d4',
      '#fadfb7',
      '#869e3c',
      '#cbdd7e',
      '#fced95'
    ],
    Tropical: [
      '#f68357',
      '#fbc040',
      '#fefa56',
      '#fef0f5',
      '#90fc51',
      '#07f182',
      '#1d6ab2',
      '#12041b',
      '#2f0946'
    ],
    'Grimby Grays': [
      '#000000',
      '#ffffff',
      '#2f3032',
      '#252422',
      '#545758',
      '#4b4a46',
      '#797d80',
      '#71706c',
      '#9ea1a4',
      '#979692',
      '#c4c8cb',
      '#d7d6d2',
      '#dee1e4',
      '#f0efeb'
    ],
    'DawnBringer 16': [
      '#140c1c',
      '#442434',
      '#30346d',
      '#4e4a4e',
      '#854c30',
      '#346524',
      '#d04648',
      '#757161',
      '#597dce',
      '#d27d2c',
      '#8595a1',
      '#6daa2c',
      '#d2aa99',
      '#6dc2ca',
      '#dad45e',
      '#deeed6'
    ],
    'Fury Road': [
      '#020c16',
      '#023745',
      '#08616d',
      '#36d4b6',
      '#0afef6',
      '#fce173',
      '#e29f30',
      '#b56942',
      '#ad3f16',
      '#893f1d'
    ],
    Candy: [
      '#06063c',
      '#4f95ff',
      '#68f9ff',
      '#fffef9',
      '#ff96f8',
      '#ff44d3',
      '#793abd'
    ],
    Holiday: [
      '#e91434',
      '#97200a',
      '#c66a20',
      '#fdbe30',
      '#688625',
      '#004f28',
      '#112825',
      '#1c69bf',
      '#6096d3',
      '#a5c4e6',
      '#f7d9f0',
      '#f6f6f6'
    ],
    Blues: [
      '#929aa8',
      '#896868',
      '#546c7d',
      '#633d3d',
      '#284660',
      '#421f29',
      '#232e3f',
      '#0f1328'
    ],
    'Sin City': ['#ffffff', '#ff0000', '#000000'],
    'Lucky Clover': [
      '#ffffff',
      '#fcf4c4',
      '#f7b307',
      '#fc8404',
      '#cd7a14',
      '#9bf23e',
      '#40d910',
      '#34900b',
      '#0c442c'
    ],
    "D's Exclusive": [
      '#000000',
      '#717474',
      '#ffffff',
      '#f25b99',
      '#e4965e',
      '#ffc416',
      '#ffe38f',
      '#0074d9',
      '#09a3ec',
      '#12d1ff',
      '#bcf5ff',
      '#0ee446'
    ],
    'Retina Burn': ['#bc0bff', '#ff0b11'],
    Easter: [
      '#9678ba',
      '#bc9ff0',
      '#e4ccff',
      '#ffa1f1',
      '#fbd0ee',
      '#e6f2ff',
      '#aaedfb',
      '#f4dc7b',
      '#fdfabd',
      '#a1ef85',
      '#ddf7a8'
    ],
    Neapolitan: ['#3f3245', '#ff5c98', '#ecb2a4', '#fff7e1'],
    Lemonade: [
      '#645f87',
      '#37aab4',
      '#8ce6c3',
      '#d7ffb4',
      '#ff7d91',
      '#ffaaa5',
      '#ffd2af',
      '#ffebaa'
    ],
    'School Pen': ['#07207a', '#000000', '#d8110c', '#097536', '#fbfcfd']
  };

  const anbt = {
    container: null,
    svg: createSvgElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      version: '1.1',
      width: '600',
      height: '500'
    }),
    canvas: document.createElement('canvas'),
    canvasDisp: document.createElement('canvas'),
    svgDisp: createSvgElement('svg', {
      version: '1.1',
      width: '600',
      height: '500',
      'pointer-events': 'none'
    }),
    svgHist: null,
    path: null,
    points: null,
    pngBase64: null,
    lastrect: 0,
    position: 0,
    isStroking: false,
    isPlaying: false,
    size: 14,
    smoothening: 1,
    palette: palettes.Normal,
    patternCache: {},
    delay: 100,
    unsaved: false,
    background: '#fffdc9',
    transparent: false,
    colors: ['#000000', 'eraser'],
    fastUndoLevels: 10,
    rewindCache: [],
    bindContainer,
    packPlayback,
    unpackPlayback,
    findLastRect,
    cutHistoryBeforeClearAndAfterPosition,
    makePng,
    fromPng,
    fromUrl,
    fromLocalFile,
    setBackground,
    setColor,
    setSize,
    drawSvgElement,
    updateView,
    drawDispLinePresto,
    drawDispLine,
    strokeBegin,
    strokeEnd,
    strokeAdd,
    clearWithColor,
    addToSvg,
    undo,
    redo,
    moveSeekbar,
    setSeekbarMove,
    getSeekMax,
    seek,
    play,
    playTimer,
    pause,
    moveCursor,
    showEyedropperCursor,
    eyedropper,
    requestSave,
    uploadToImgur,
    lock,
    unlock
  };

  const globals = {
    rectangle: {},
    touchSingle: false,
    lastTouch: {},
    lastSeenColorToHighlight: anbt.background,
    brushSizes: [2, 6, 14, 42],
    timerStart: 0
  };

  const changeBrushSize = event => {
    event.preventDefault();
    const size = [...event.currentTarget.classList]
      .filter(htmlClass => htmlClass.startsWith('size-'))[0]
      .match(/\d+/)[0];
    setSize(size);
    const element = ID('tools').querySelector('.sel');
    if (element) element.classList.remove('sel');
    event.currentTarget.classList.add('sel');
    if (!anbt.isStroking) return;
    strokeEnd();
    const lastPoint = anbt.points[anbt.points.length - 1];
    strokeBegin(lastPoint.x, lastPoint.y);
  };

  const clickRedo = event => {
    event.preventDefault();
    ID('play').classList.remove('pause');
    redo();
  };

  const updateChooseBackground = chooseBackground => {
    globals.chooseBackground = chooseBackground;
    if (chooseBackground) {
      ID('colors').classList.add('setbackground');
      ID('setbackground').classList.add('sel');
    } else {
      ID('colors').classList.remove('setbackground');
      ID('setbackground').classList.remove('sel');
    }
  };

  const clickSetBackground = event => {
    event.preventDefault();
    updateChooseBackground(!globals.chooseBackground);
  };

  const clickTrash = event => {
    event.preventDefault();
    clearWithColor('eraser');
    if (ID('newcanvasyo').classList.contains('sandbox'))
      globals.timerStart = Date.now();
  };

  const clickUndo = event => {
    event.preventDefault();
    ID('play').classList.remove('pause');
    undo();
  };

  const getPointerType = () =>
    ID('wacom') && ID('wacom').penAPI && ID('wacom').penAPI.isWacom
      ? ID('wacom').penAPI.pointerType
      : 0;

  const updateColorIndicators = () => {
    const { colors } = anbt;
    ['primary', 'secondary'].forEach((id, index) => {
      if (colors[index] === 'eraser') {
        ID(id).style.backgroundColor = 'pink';
        ID(id).classList.add('eraser');
      } else {
        ID(id).style.backgroundColor = colors[index];
        ID(id).classList.remove('eraser');
      }
    });
  };

  const colorClick = event => {
    if (event.touches || event.button === 0 || event.button === 2) {
      event.preventDefault();
      const colorButton = event.currentTarget;
      let color = colorButton.style.backgroundColor;
      if (globals.chooseBackground) {
        if (colorButton.id !== 'eraser') setBackground(color);
        updateChooseBackground(false);
      } else {
        if (colorButton.id === 'eraser') color = 'eraser';
        if (event.button === 2 || getPointerType() === 3) setColor(1, color);
        else setColor(0, color);
        updateColorIndicators();
      }
    }
  };

  const playCommonDown = event => {
    event.stopPropagation();
    event.preventDefault();
    if (anbt.isPlaying) {
      ID('play').classList.remove('pause');
      pause();
    } else {
      ID('play').classList.add('pause');
      play();
    }
  };

  const removeEyedropper = event => {
    if (event.altKey) return;
    event.currentTarget.classList.remove('hidecursor');
    showEyedropperCursor(false);
    event.currentTarget.removeEventListener('mousemove', removeEyedropper);
  };

  const keyDown = event => {
    const { options } = window;
    if (document.activeElement instanceof HTMLInputElement) return true;
    if (event.keyCode === 18) {
      if (!navigator.userAgent.match(/\bPresto\b/))
        ID('svgContainer').classList.add('hidecursor');
      showEyedropperCursor(true);
      ID('svgContainer').addEventListener('mousemove', removeEyedropper);
    } else if (event.keyCode === 'Q'.charCodeAt(0)) {
      event.preventDefault();
      options.colorDoublePress = !options.colorDoublePress;
    } else if (
      event.keyCode === 'Z'.charCodeAt(0) ||
      (event.keyCode === 8 && anbt.unsaved)
    ) {
      event.preventDefault();
      ID('play').classList.remove('pause');
      undo();
    } else if (event.keyCode === 'Y'.charCodeAt(0)) {
      event.preventDefault();
      ID('play').classList.remove('pause');
      redo();
    } else if (event.keyCode === 'X'.charCodeAt(0)) {
      event.preventDefault();
      const [color0, color1] = anbt.color;
      setColor(0, color1);
      setColor(1, color0);
      updateColorIndicators();
    } else if (event.keyCode === 'B'.charCodeAt(0)) {
      if (ID('setbackground').hidden) return;
      event.preventDefault();
      updateChooseBackground(!globals.chooseBackground);
    } else if (
      event.keyCode === 'E'.charCodeAt(0) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      setColor(0, 'eraser');
      updateColorIndicators();
    } else if (
      event.keyCode >= 48 &&
      event.keyCode <= 57 &&
      !event.ctrlKey &&
      !event.metaKey &&
      options.colorNumberShortcuts
    ) {
      event.preventDefault();
      let index = event.keyCode === 48 ? 9 : event.keyCode - 49;
      if (
        event.shiftKey ||
        (options.colorDoublePress && anbt.prevColorKey === index)
      )
        index += 8;
      anbt.prevColorKey = index;
      if (options.colorDoublePress) {
        if (anbt.prevColorKeyTimer) clearTimeout(anbt.prevColorKeyTimer);
        anbt.prevColorKeyTimer = setTimeout(
          () => (anbt.prevColorKey = -1),
          500
        );
      }
      const elements = ID('colors').querySelectorAll('b');
      if (index < elements.length) {
        const color =
          elements[index].id === 'eraser'
            ? 'eraser'
            : elements[index].style.backgroundColor;
        if (globals.chooseBackground) {
          if (color !== 'eraser') setBackground(color);
          updateChooseBackground(false);
        } else {
          setColor(0, color);
          updateColorIndicators();
        }
      }
      if (anbt.isStroking) {
        strokeEnd();
        const lastPoint = anbt.points[anbt.points.length - 1];
        strokeBegin(lastPoint.x, lastPoint.y);
      }
    } else if (
      (event.keyCode === 189 ||
        event.keyCode === 219 ||
        event.keyCode === 188) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      for (let i = 1; i < globals.brushSizes.length; i++) {
        if (anbt.size - globals.brushSizes[i] < 0.01) {
          ID('brush' + (i - 1)).click();
          break;
        }
      }
    } else if (
      (event.keyCode === 187 ||
        event.keyCode === 221 ||
        event.keyCode === 190) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      for (let i = 0; i < globals.brushSizes.length - 1; i++) {
        if (anbt.size - globals.brushSizes[i] < 0.01) {
          ID('brush' + (i + 1)).click();
          break;
        }
      }
    } else if (
      event.keyCode >= 49 &&
      event.keyCode <= 52 &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      ID('brush' + (event.keyCode - 49)).click();
    } else if (
      event.keyCode === 32 &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey
    )
      playCommonDown(event);
  };

  const keyUp = event => {
    if (event.keyCode !== 18) return;
    ID('svgContainer').classList.remove('hidecursor');
    showEyedropperCursor(false);
  };

  const warnStrokesAfterPosition = () => {
    if (anbt.position < getSeekMax())
      return !confirm(
        'Strokes after current position wi)ll be discarded. Continue?'
      );
  };

  const doExport = event => {
    event.preventDefault();
    if (warnStrokesAfterPosition()) return;
    makePng(600, 500, true);
    requestSave();
  };

  const doImport = event => {
    event.preventDefault();
    ID('svgContainer').classList.add('loading');
    fromLocalFile();
    ID('svgContainer').classList.remove('loading');
  };

  const exportToImgur = event => {
    event.preventDefault();
    if (warnStrokesAfterPosition()) return;
    ID('imgur').childNodes[0].nodeValue = 'Uploading...';
    ID('imgur').disabled = true;
    makePng(600, 500, true);
    uploadToImgur(request => {
      ID('imgur').childNodes[0].nodeValue = 'Upload to imgur';
      ID('popup').classList.add('show');
      ID('popuptitle').childNodes[0].nodeValue = 'Imgur upload result';
      if (request && request.success) {
        anbt.unsaved = false;
        ID('imgururl').href = `http://imgur.com/${request.data.id}`;
        ID('imgururl').childNodes[0].nodeValue = 'Uploaded image';
        ID(
          'imgurdelete'
        ).href = `http://imgur.com/delete/${request.data.deletehash}`;
        ID('imgurerror').childNodes[0].nodeValue = '';
        if (window.inforum)
          window.frameElement.ownerDocument.getElementById(
            'input-comment'
          ).value += `![](http://i.imgur.com/${request.data.id}.png)`;
      } else {
        const error = request.data
          ? `Imgur error: ${request.data.error}`
          : `Error: ${request}`;
        ID('imgurerror').childNodes[0].nodeValue = error;
      }
      ID('imgur').disabled = false;
    });
  };

  const knobCommonMove = event => {
    event.preventDefault();
    const length = getSeekMax();
    let x = event.touches
      ? event.touches[0].pageX - globals.rectangle.left - 34
      : event.pageX - globals.rectangle.left - pageXOffset - 34;
    x = Math.min(Math.max(-10, x), 492);
    const position = Math.round(((x + 10) / 502) * length);
    x = (position / length) * 502 - 10;
    ID('knob').classList.add('smooth');
    ID('knob').style.marginLeft = x + 'px';
    seek(position);
    ID('play').classList.remove('pause');
  };

  const knobCommonUp = event => {
    if (!event.button || (!event.touches && !event.touches.length)) {
      event.preventDefault();
      window.removeEventListener('mouseup', knobCommonUp);
      window.removeEventListener('touchend', knobCommonUp);
      window.removeEventListener('mousemove', knobCommonMove);
      window.removeEventListener('touchmove', knobCommonMove);
    }
  };

  const knobCommonDown = event => {
    if (event.button === 0 || (event.touches && event.touches.length === 1)) {
      globals.rectangle = ID('seekbar').getBoundingClientRect();
      knobCommonMove(event);
      window.addEventListener('mouseup', knobCommonUp);
      window.addEventListener('touchend', knobCommonUp);
      window.addEventListener('mousemove', knobCommonMove);
      window.addEventListener('touchmove', knobCommonMove);
    }
  };

  const knobMove = fraction => {
    const x = Math.floor(fraction * 502 - 10);
    if (fraction > 0) {
      ID('knob').classList.add('smooth');
    } else {
      ID('knob').classList.remove('smooth');
    }
    ID('knob').style.marginLeft = x + 'px';
    if (fraction >= 1) {
      ID('play').classList.remove('pause');
    }
  };

  const noDefault = event => event.preventDefault();

  const setPaletteByName = name => {
    ID('palettename').childNodes[0].nodeValue = name;
    const colors = palettes[name];
    anbt.palette = colors;
    const palette = ID('palette');
    const elements = palette.querySelectorAll('b');
    elements.forEach(element => palette.removeChild(element));
    const eraser = elements[elements.length - 1];
    colors.forEach(color => {
      const bElement = document.createElement('b');
      bElement.style.backgroundColor = color;
      bElement.addEventListener('mousedown', colorClick);
      bElement.addEventListener('touchend', colorClick);
      bElement.addEventListener('contextmenu', noDefault);
      palette.appendChild(bElement);
      palette.appendChild(eraser);
    });
  };

  const choosePalette = event => {
    if (event.touches || event.button === 0) {
      event.preventDefault();
      const name = event.currentTarget.childNodes[0].nodeValue;
      setPaletteByName(name);
    }
  };

  const closePaletteList = event => {
    if (event.touches || event.button === 0) {
      ID('palettechooser').classList.remove('open');
      window.removeEventListener('mousedown', closePaletteList);
      window.removeEventListener('touchend', closePaletteList);
    }
  };

  const openPaletteList = event => {
    if (event.touches || event.button === 0) {
      event.preventDefault();
      const chooser = ID('palettechooser');
      chooser.classList.toggle('open');
      if (chooser.classList.contains('open')) {
        setTimeout(() => {
          window.addEventListener('mousedown', closePaletteList);
          window.addEventListener('touchend', closePaletteList);
        }, 1);
      }
      const keys = Object.keys(palettes);
      if (chooser.childNodes.length < keys.length) {
        const canvas = document.createElement('canvas');
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        for (let i = chooser.childNodes.length; i < keys.length; i++) {
          canvas.width = 8 * palettes[keys[i]].length + 2;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 0.5;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          palettes[keys[i]].forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(index * 8 + 1, 1, 8, 8);
          });
          const div = document.createElement('div');
          div.appendChild(document.createTextNode(keys[i]));
          div.style.backgroundImage = `url("${canvas.toDataURL()}")`;
          div.style.backgroundRepeat = 'no-repeat';
          div.style.backgroundPosition = 'center 35px';
          div.addEventListener('mousedown', choosePalette);
          div.addEventListener('touchend', choosePalette);
          chooser.appendChild(div);
        }
      }
    }
  };

  const popupClose = event => {
    event.preventDefault();
    ID('popup').classList.remove('show');
  };

  const svgContextMenu = event => event.preventDefault();

  const checkPlayingAndStop = () => {
    if (!anbt.isPlaying) return false;
    pause();
    ID('play').classList.remove('pause');
    return true;
  };

  const windowMouseMove = event => {
    event.preventDefault();
    if (!anbt.isStroking) return;
    const x = event.pageX - globals.rectangle.left - pageXOffset;
    const y = event.pageY - globals.rectangle.top - pageYOffset;
    strokeAdd(x, y);
  };

  const mouseUp = event => {
    const { options } = window;
    if (event.button === 0 || event.button === 2) {
      event.preventDefault();
      if (anbt.isStroking) strokeEnd();
      if (options.hideCross) ID('svgContainer').classList.remove('hidecursor');
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('mousemove', windowMouseMove);
    }
  };

  const mouseDown = event => {
    const { options } = window;
    if (event.button === 0 || event.button === 2) {
      if (anbt.isStroking) return mouseUp(event);
      if (checkPlayingAndStop()) return;
      event.preventDefault();
      globals.rectangle = event.currentTarget.getBoundingClientRect();
      const x = event.pageX - globals.rectangle.left - pageXOffset;
      const y = event.pageY - globals.rectangle.top - pageYOffset;
      if (event.altKey) {
        setColor(event.button ? 1 : 0, eyedropper(x, y));
        updateColorIndicators();
      } else {
        const left = event.button === 0 && getPointerType() !== 3;
        if (options.hideCross) ID('svgContainer').classList.add('hidecursor');
        strokeBegin(x, y, left);
        window.addEventListener('mouseup', mouseUp);
        window.addEventListener('mousemove', windowMouseMove);
      }
    }
  };

  const mouseLeave = () => moveCursor(-100, -100);

  const svgMouseMove = event => {
    const { options } = window;
    globals.rectangle = event.currentTarget.getBoundingClientRect();
    const x = event.pageX - globals.rectangle.left - pageXOffset;
    const y = event.pageY - globals.rectangle.top - pageYOffset;
    moveCursor(x, y);
    if (options.colorUnderCursorHint && !anbt.isStroking) {
      const color = eyedropper(x, y);
      if (globals.stSeenColorToHighlight !== color) {
        const element = ID('colors').querySelector('b.hint');
        if (element) element.classList.remove('hint');
        const colorIndex = anbt.palette.indexOf(color);
        if (colorIndex >= 0) {
          const elements = ID('colors').querySelectorAll('b');
          elements[colorIndex].classList.add('hint');
        }
      }
      globals.lastSeenColorToHighlight = color;
    }
  };

  const simulateSingleTouchStart = () => {
    if (!globals.touchSingle) return;
    const x = globals.lastTouch.pageX - globals.rectangle.left;
    const y = globals.lastTouch.pageY - globals.rectangle.top;
    strokeBegin(x, y, true);
    globals.touchSingle = false;
  };

  const touchMove = event => {
    if (event.touches.length !== 1) return;
    simulateSingleTouchStart();
    event.preventDefault();
    if (!anbt.isStroking) return;
    const x = event.touches[0].pageX - globals.rectangle.left;
    const y = event.touches[0].pageY - globals.rectangle.top;
    strokeAdd(x, y);
  };

  const touchEnd = event => {
    if (event.touches.length !== 0) return;
    simulateSingleTouchStart();
    event.preventDefault();
    window.removeEventListener('touchend', touchEnd);
    window.removeEventListener('touchmove', touchMove);
    strokeEnd();
  };

  const touchUndoRedo = event => {
    if (event.changedTouches.length === 1 && event.touches.length === 1) {
      const { pageX, pageY } = event.changedTouches[0];
      if (
        Math.abs(pageX - globals.lastTouch.pageX) < 10 &&
        Math.abs(pageY - globals.lastTouch.pageY) < 10
      ) {
        ID('play').classList.remove('pause');
        if (pageX < event.touches[0].pageX) undo();
        else redo();
      }
    }
    window.removeEventListener('touchend', touchUndoRedo);
  };

  const touchStart = event => {
    if (event.touches.length === 1) {
      if (checkPlayingAndStop()) return;
      globals.rectangle = event.currentTarget.getBoundingClientRect();
      globals.touchSingle = true;
      globals.lastTouch = event.touches[0];
      window.addEventListener('touchend', touchEnd);
      window.addEventListener('touchmove', touchMove);
    } else {
      if (globals.touchSingle && event.touches.length === 3) {
        globals.lastTouch = event.touches[1];
        window.addEventListener('touchend', touchUndoRedo);
      }
      globals.touchSingle = false;
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchmove', touchMove);
      if (anbt.isStroking) strokeEnd();
    }
  };

  const beforeUnload = event => {
    if (!anbt.unsaved) return;
    const message = "You haven't saved the drawing. Abandon?";
    event.returnValue = message;
    return message;
  };

  const windowContextMenu = event => {
    if (anbt.isStroking) event.preventDefault();
  };

  const error = event => alert(event);

  const bindEvents = () => {
    ID('svgContainer').addEventListener('mousedown', mouseDown);
    ID('svgContainer').addEventListener('mousemove', svgMouseMove);
    ID('svgContainer').addEventListener('touchstart', touchStart);
    ID('svgContainer').addEventListener('mouseleave', mouseLeave);
    ID('svgContainer').addEventListener('contextmenu', svgContextMenu);
    ID('import').addEventListener('click', doImport);
    ID('export').addEventListener('click', doExport);
    ID('imgur').addEventListener('click', exportToImgur);
    document.querySelectorAll('.brush').forEach((brush, index) => {
      brush.classList.add(`size-${globals.brushSizes[index]}`);
      brush.addEventListener('mousedown', changeBrushSize);
      brush.addEventListener('click', changeBrushSize);
    });
    ID('colors')
      .querySelectorAll('b')
      .forEach(color => {
        color.addEventListener('mousedown', colorClick);
        color.addEventListener('touchend', colorClick);
        color.addEventListener('contextmenu', noDefault);
      });
    ID('setbackground').addEventListener('click', clickSetBackground);
    ID('undo').addEventListener('click', clickUndo);
    ID('redo').addEventListener('click', clickRedo);
    ID('trash').addEventListener('click', clickTrash);
    setSeekbarMove(knobMove);
    ID('knob').addEventListener('mousedown', knobCommonDown);
    ID('knob').addEventListener('touchstart', knobCommonDown);
    ID('seekbar').addEventListener('mousedown', knobCommonDown);
    ID('seekbar').addEventListener('touchstart', knobCommonDown);
    ID('play').addEventListener('mousedown', playCommonDown);
    ID('play').addEventListener('touchstart', playCommonDown);
    ID('palettename').addEventListener('mousedown', openPaletteList);
    ID('palettename').addEventListener('touchend', openPaletteList);
    ID('popupclose').addEventListener('click', popupClose);
    document.addEventListener('keyup', keyUp);
    document.addEventListener('keydown', keyDown);
    window.addEventListener('contextmenu', windowContextMenu);
    window.addEventListener('error', error);
    window.addEventListener('beforeunload', beforeUnload);
  };

  const fixTabletPluginGoingAwol = () => {
    const stupidPlugin = ID('wacom');
    const container = ID('wacomContainer');
    window.onblur = () => {
      if (container.childNodes.length === 1)
        container.removeChild(stupidPlugin);
    };
    window.onfocus = () => {
      if (container.childNodes.length === 0)
        container.appendChild(stupidPlugin);
    };
  };

  const ajax = (type, url, params) => {
    const { options } = window;
    const request = new XMLHttpRequest();
    request.open(type, url);
    if (params.header)
      request.setRequestHeader(params.header[0], params.header[1]);
    params.retry = 5;
    request.timeout = 15000;
    request.ontimeout = () => {
      if (params.retry > 0) {
        if (!options.retryEnabled) return;
        document.body.style.cursor = 'progress';
        params.retry--;
        ajax(type, url, params);
      } else {
        document.body.style.cursor = '';
        params.error();
      }
    };
    request.onload = () => {
      if (
        url === '/play/skip.json' &&
        request.error === 'Sorry, but we couldn\u0027t find your current game.'
      ) {
        location.reload();
        return;
      }
      if (
        url === '/play/exit.json' &&
        request.error === 'Sorry, but we couldn\u0027t find your current game.'
      ) {
        location.pathname = '/';
        return;
      }
      params.load(request.responseText);
    };
    request.onerror = () => {
      if (params.error) params.error(request);
      else params.load(request);
    };
    if (params.obj) request.send(JSON.stringify(params.obj));
    else request.send();
    document.body.style.cursor = '';
    return;
  };

  const backToForum = event => {
    event.preventDefault();
    window.frameElement.ownerDocument.querySelector(
      '.v--modal-overlay'
    ).outerHTML = '';
  };

  const decodeHTML = html => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const bookmark = () => {
    const { getLocalStorageItem } = window;
    ID('bookmark').disabled = true;
    const games = getLocalStorageItem('gpe_gameBookmarks', {});
    const caption = window.gameInfo.caption;
    games[window.gameInfo.gameid] = {
      time: Date.now(),
      caption: caption ? decodeHTML(caption) : ''
    };
    localStorage.setItem('gpe_gameBookmarks', JSON.stringify(games));
  };

  const caption = event => {
    if (event.keyCode !== 13) return;
    event.preventDefault();
    ID('submitcaption').click();
  };

  const updateTimer = () => {
    let seconds = (globals.timerStart - Date.now()) / 1000;
    try {
      if (window.timerCallback) window.timerCallback(seconds);
    } catch (e) {}
    seconds = Math.abs(seconds);
    const minutes = `0${Math.floor(seconds / 60)}`.slice(-2);
    seconds = `0${Math.floor(seconds % 60)}`.slice(-2);
    ID('timer').childNodes[0].nodeValue = `${minutes}:${seconds}`;
  };

  const exitToSandbox = () => {
    const { incontest, gameInfo, drawing_aborted, vertitle } = window;
    if (incontest && !drawing_aborted)
      ajax('POST', '/contests/exit.json', {
        load: () => alert('You have missed your contest.')
      });
    if (gameInfo.drawfirst && !drawing_aborted) {
      ajax('POST', '/play/abort-start.json', {
        obj: {
          game_token: gameInfo.gameid
        },
        load: () =>
          alert('You have missed your Draw First game.\nIt has been aborted.'),
        error: () =>
          alert(
            'You have missed your Draw First game.\nI tried aborting it, but an error occured. :('
          )
      });
    }
    globals.timerStart = Date.now();
    ID('newcanvasyo').className = 'sandbox';
    window.timerCallback = () => {};
    updateTimer();
    document.title = 'Sandbox - Drawception';
    ID('gamemode').innerHTML = 'Sandbox';
    ID('headerinfo').innerHTML = `Sandbox with ${vertitle}`;
    try {
      history.replaceState({}, null, '/sandbox/');
    } catch (e) {}
    unlock();
  };

  const exit = () => {
    const { gameInfo, incontest } = window;
    if (incontest) {
      if (!confirm('Quit the contest? Entry coins will be lost!')) return;
      ID('exit').disabled = true;
      ajax('POST', '/contests/exit.json', {
        load: () => {
          ID('exit').disabled = false;
          window.drawing_aborted = true;
          exitToSandbox();
          document.location.pathname = '/contests/';
        },
        error: () => {
          ID('exit').disabled = false;
          alert('Server error. :( Try again?');
        }
      });
      return;
    }
    if (gameInfo.drawfirst) {
      if (!confirm('Abort creating a draw first game?')) return;
      ID('exit').disabled = true;
      ajax('POST', '/play/abort-start.json', {
        obj: {
          game_token: gameInfo.gameid
        },
        load: () => {
          ID('exit').disabled = false;
          window.drawing_aborted = true;
          exitToSandbox();
          document.location.pathname = '/create/';
        },
        error: () => {
          ID('exit').disabled = false;
          alert('Server error. :( Try again?');
        }
      });
      return;
    }
    if (!confirm('Really exit?')) return;
    ID('exit').disabled = true;
    ajax('POST', '/play/exit.json', {
      obj: {
        game_token: gameInfo.gameid
      },
      load: () => {
        ID('exit').disabled = false;
        exitToSandbox();
      }
    });
  };

  const quit = event => {
    event.preventDefault();
    window.top.location.href = 'https://drawception.com/';
  };

  const extractInfoFromHTML = html => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = html;
    const drawapp = doc.querySelector('draw-app') ||
      doc.querySelector('describe') || {
        getAttribute: () => false
      };
    const getElement = query => doc.querySelector(query);
    return {
      error: (element => (element ? element.src : false))(getElement('.error')),
      gameid: drawapp.getAttribute('game_token'),
      blitz: drawapp.getAttribute(':blitz_mode') === 'true',
      nsfw: drawapp.getAttribute(':nsfw') === 'true',
      friend: drawapp.getAttribute(':game_public') !== 'true',
      drawfirst: drawapp.getAttribute(':draw_first') === 'true',
      timeleft: drawapp.getAttribute(':seconds') * 1,
      caption: drawapp.getAttribute('phrase'),
      image: drawapp.getAttribute('img_url'),
      palette: drawapp.getAttribute('theme_id'),
      bgbutton: drawapp.getAttribute(':bg_layer') === 'true',
      playerurl: '/profile/',
      avatar: null,
      coins: '-',
      pubgames: '-',
      friendgames: '-',
      notifications: '-',
      drawinglink: (element => (element ? element.src : false))(
        getElement('.gamepanel img')
      ),
      drawingbylink: (element =>
        element ? [element.textContent.trim(), element.href] : false)(
        getElement('#main p a')
      ),
      drawncaption: (element => (element ? element.src : false))(
        getElement('h1.game-title')
      ),
      notloggedin: getElement('form.form-login') !== null,
      limitreached: false,
      html
    };
  };

  const palettemap = {
    default: ['Normal', '#fffdc9'],
    theme_thanksgiving: ['Thanksgiving', '#f5e9ce'],
    halloween: ['Halloween', '#444444'],
    theme_cga: ['CGA', '#ffff55'],
    shades_of_grey: ['Grayscale', '#e9e9e9'],
    theme_bw: ['Black and white', '#ffffff'],
    theme_gameboy: ['Gameboy', '#9bbc0f'],
    theme_neon: ['Neon', '#00abff'],
    theme_sepia: ['Sepia', '#ffe2c4'],
    theme_valentines: ["Valentine's", '#ffccdf'],
    theme_blues: ['the blues', '#295c6f'],
    theme_spring: ['Spring', '#ffffff'],
    theme_beach: ['Beach', '#f7dca2'],
    theme_beach_2: ['Tide Pool', '#2271a2'],
    theme_coty_2016: ['Colors of 2016', '#648589'],
    theme_bee: ['Bee', '#ffffff'],
    theme_coty_2017: ['Colors of 2017', '#5f7278'],
    theme_fire_ice: ['Fire and Ice', '#040526'],
    theme_coty_2018: ['Canyon Sunset', '#2e1b50'],
    theme_juice: ['Juice', '#fced95'],
    theme_tropical: ['Tropical', '#2f0946'],
    theme_grimby_grays: ['Grimby Grays', '#f0efeb'],
    theme_fury_road: ['Fury Road', '#893f1d'],
    theme_candy: ['Candy', '#793abd'],
    theme_holiday_2: ['Holiday', '#f6f6f6'],
    theme_blues_2: ['Blues', '#0f1328'],
    theme_sin_city: ['Sin City', '#000000'],
    theme_lucky_clover: ['Lucky Clover', '#0c442c'],
    theme_drawception: ["D's Exclusive", '#0ee446'],
    theme_retina_burn: ['Retina Burn', '#ff0b11'],
    theme_easter: ['Easter', '#ddf7a8'],
    theme_neapolitan: ['Neapolitan', '#fff7e1'],
    theme_lemonade: ['Lemonade', '#ffebaa'],
    theme_school_pen: ['School Pen', '#fbfcfd']
  };

  const getPalData = palette => {
    if (palette === 'theme_roulette') {
      alert(
        "Warning: Drawception roulette didn't give a theme. ANBT will choose a random palette."
      );
      delete palettes.Roulette;
      const keys = Object.keys(palettemap);
      const paletteName = keys[(keys.length * Math.random()) << 0];
      palettes.Roulette = palettes[palettemap[paletteName][0]];
      return ['Roulette', palettemap[paletteName][1]];
    } else {
      if (palette) return palettemap[palette.toLowerCase()];
    }
  };

  const handleCommonParameters = () => {
    const { gameInfo, inforum } = window;
    if (gameInfo.notloggedin)
      return (ID('start').parentNode.innerHTML =
        '<a href="/login" class="headerbutton active">Login</a> <a href="/register" class="headerbutton active">Register</a>');
    if (gameInfo.avatar) ID('infoavatar').src = gameInfo.avatar;
    ID('infoprofile').href = gameInfo.playerurl;
    ID('infocoins').innerHTML = gameInfo.coins;
    ID('infogames').innerHTML = gameInfo.pubgames;
    ID('infofriendgames').innerHTML = gameInfo.friendgames || 0;
    ID('infonotifications').innerHTML = gameInfo.notifications;
    if (inforum) document.querySelector('.headerright').hidden = true;
  };

  const timerCallback = seconds => {
    const { gameInfo } = window;
    if (seconds < 1) {
      document.title = "[TIME'S UP!] Playing Drawception";
      if (gameInfo.image || window.timesup) {
        if (!window.submitting) {
          if (gameInfo.image) getParametersFromPlay();
          else exitToSandbox();
        }
      } else {
        ID('newcanvasyo').classList.add('locked');
        lock();
        globals.timerStart += 15000;
        updateTimer();
        window.timesup = true;
      }
    } else
      document.title = `[${`0${Math.floor(seconds / 60)}`.slice(
        -2
      )}:${`0${Math.floor(seconds % 60)}`.slice(-2)}] Playing Drawception`;
    if (
      window.alarm &&
      !window.playedWarningSound &&
      seconds <= (gameInfo.blitz ? 5 : 61) &&
      seconds > 0
    ) {
      window.alarm.play();
      window.playedWarningSound = true;
    }
  };

  const handlePlayParameters = () => {
    const { options, gameInfo, incontest, vertitle } = window;
    ID('skip').disabled = gameInfo.drawfirst || incontest;
    ID('report').disabled = gameInfo.drawfirst || incontest;
    ID('exit').disabled = false;
    ID('start').disabled = false;
    ID('bookmark').disabled = gameInfo.drawfirst || incontest;
    ID('options').disabled = true;
    ID('timeplus').disabled = incontest;
    ID('submit').disabled = false;
    ID('headerinfo').innerHTML = `Playing with ${vertitle}`;
    ID('drawthis').classList.add('onlyplay');
    ID('emptytitle').classList.remove('onlyplay');
    window.submitting = false;
    window.drawing_aborted = false;
    if (gameInfo.error) {
      alert(`Play Error:\n${gameInfo.error}`);
      return exitToSandbox();
    }
    if (gameInfo.limitreached) {
      alert('Play limit reached!');
      return exitToSandbox();
    }
    ID('gamemode').innerHTML = incontest
      ? 'Contest'
      : `${(gameInfo.friend ? 'Friend ' : 'Public ') +
          (gameInfo.nsfw ? 'Not Safe For Work (18+) ' : 'safe for work ') +
          (gameInfo.blitz ? 'BLITZ ' : '')}Game`;
    ID('drawthis').innerHTML =
      gameInfo.caption || (gameInfo.drawfirst && '(Start your game!)') || '';
    ID('tocaption').src = '';
    const newcanvas = ID('newcanvasyo');
    newcanvas.className = 'play';
    if (gameInfo.friend) newcanvas.classList.add('friend');
    ID('palettechooser').className = gameInfo.friend ? '' : 'onlysandbox';
    if (gameInfo.nsfw) newcanvas.classList.add('nsfw');
    if (gameInfo.blitz) newcanvas.classList.add('blitz');
    newcanvas.classList.add(gameInfo.image ? 'captioning' : 'drawing');
    if (anbt.isStroking) strokeEnd();
    unlock();
    for (let i = anbt.svg.childNodes.length - 1; i > 0; i--)
      anbt.svg.removeChild(anbt.svg.childNodes[i]);
    seek(0);
    moveSeekbar(1);
    anbt.unsaved = false;
    const { palette } = gameInfo;
    if (!gameInfo.image) {
      const paletteData = getPalData(palette);
      if (!paletteData) {
        if (!palette)
          alert(
            'Error, please report! Failed to extract the palette.\nAre you using the latest ANBT version?'
          );
        else
          alert(
            `Error, please report! Unknown palette: '${palette}'.\nAre you using the latest ANBT version?`
          );
        ID('submit').disabled = true;
      } else {
        setPaletteByName(paletteData[0]);
        setBackground(paletteData[1]);
        anbt.color = [palettes[paletteData[0]][0], 'eraser'];
        updateColorIndicators();
      }
      ID('setbackground').hidden = !gameInfo.bgbutton;
    } else {
      ID('tocaption').src =
        gameInfo.image.length <= 30
          ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAD6AQMAAAAho+iwAAAABlBMVEWAQED///94jotxAAABiklEQVR4Xu3W0UrCUBjA8eOO5CLK7VxLzDWFrjK6Eaha8FHuppfwBRJvdjlMIK/K3qA3OZBBd/UIm9UL2O2inMJBptNuog/6/h4Q2Y8J387Y2KIoiqIoiqIoiuIxXnbI5cmXSiJjD3LmFyrGY46PqVAx/HPDv9/w3wsJTTgapuDkcEIQMFxzo937S8+F5OkWI2IKymQl3yiZ6j8zYsRY6vUYDcOfGkuMknE5/aQAMczX9O+iKIrKJWuSxliQqT61hOmMucsYK6uzLWfDenF34EXhOX+s377KLCZcs1bxhNXQqnAvrExWM8vvY3amORCNsplu2nZPWKdj1tecTHZZLA97ZnjBB/XrkWIZWT+bsmTowp+7FHSnyMi7CpuMrWcwNsMMxnJzrCUbwwq/2/MLJb8lP4L2zVHJ35Bp1rE8Uc2bALoNHQvcoNG3Yf5Pm6EnHG50Ye0YmiG4V08LmWD7wmF9gJwFgoHbnZzNSDE/Co3orSB2YGsbovAgaD9vlkB/WbkbdQVWMNxR1Ddnf4eSZpHZYAAAAABJRU5ErkJggg=='
          : gameInfo.image;
      ID('caption').value = '';
      ID('caption').focus();
      ID('caption').setAttribute('maxlength', 45);
      ID('usedchars').textContent = '45';
    }
    if (
      (options.timeoutSound && !gameInfo.blitz) ||
      (options.timeoutSoundBlitz && gameInfo.blitz)
    ) {
      window.playedWarningSound = false;
      window.alarm = new Audio(window.alarmSoundOgg);
      window.alarm.volume = options.timeoutSoundVolume / 100;
    }
    globals.timerStart = Date.now() + 1000 * gameInfo.timeleft;
    window.timerCallback = timerCallback;
    handleCommonParameters();
    window.timesup = false;
    updateTimer();
  };

  const getParametersFromPlay = () => {
    const { incontest, friendgameid } = window;
    const url = incontest
      ? '/contests/play/'
      : `/play/${friendgameid ? `${friendgameid}/` : ''}`;
    try {
      if (location.pathname !== url) history.replaceState({}, null, url);
    } catch (e) {}
    ajax('GET', `${url}?${Date.now()}`, {
      load: response => {
        window.gameInfo = response
          ? extractInfoFromHTML(response)
          : {
              error: 'Server returned a blank response :('
            };
        handlePlayParameters();
      },
      error: response => {
        window.gameInfo = {
          error: `Server error: ${response.statusText}`
        };
        handlePlayParameters();
      }
    });
  };

  const report = () => {
    if (!confirm('Report this panel?')) return;
    ajax('POST', '/play/flag.json', {
      obj: {
        game_token: window.gameInfo.gameid
      },
      load: () => {
        ID('report').disabled = false;
        getParametersFromPlay();
      }
    });
  };

  const unsavedStopAction = () =>
    anbt.unsaved && !confirm("You haven't saved the drawing. Abandon?");

  const skip = () => {
    if (unsavedStopAction()) return;
    ID('skip').disabled = true;
    ajax('POST', '/play/skip.json', {
      obj: {
        game_token: window.gameInfo.gameid
      },
      load: () => getParametersFromPlay(),
      error: () => {
        ID('skip').disabled = false;
        getParametersFromPlay();
      }
    });
  };

  const start = () => {
    if (unsavedStopAction()) return;
    ID('start').disabled = true;
    getParametersFromPlay();
  };

  const onCaptionSuccess = title => {
    const { options, gameInfo } = window;
    if (!options.bookmarkOwnCaptions) return;
    const games = window.getLocalStorageItem('gpe_gameBookmarks', {});
    games[gameInfo.gameid] = {
      time: Date.now(),
      caption: `"${title}"`,
      own: true
    };
    localStorage.setItem('gpe_gameBookmarks', JSON.stringify(games));
  };

  const submitCaption = () => {
    const { incontest, gameInfo } = window;
    const title = ID('caption').value;
    if (!title) {
      ID('caption').focus();
      return alert("You haven't entered a caption!");
    }
    window.submitting = true;
    ID('submitcaption').disabled = true;
    const url = incontest
      ? '/contests/submit-caption.json'
      : '/play/describe.json';
    ajax('POST', url, {
      obj: {
        game_token: gameInfo.gameid,
        title
      },
      load: response => {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = {
            error: response
          };
        }
        if (response.error) {
          ID('submitcaption').disabled = false;
          if (typeof response.error === 'object')
            alert(
              `Error! Please report this data:\ngame: ${
                gameInfo.gameid
              }\n\nresponse: \n${JSON.stringify(response.error)}`
            );
          else alert(response.error);
        } else if (response.message) {
          ID('submitcaption').disabled = false;
          alert(response.message);
        } else if (response.url) {
          onCaptionSuccess(title);
          anbt.unsaved = false;
          location.replace(response.url);
        }
      },
      error: () => {
        ID('submitcaption').disabled = false;
        alert('Server error. :( Try again?');
      }
    });
  };

  const submitDrawing = () => {
    const { incontest, gameInfo, options } = window;
    const moreThanMinuteLeft = globals.timerStart - Date.now() > 60000;
    if (
      options.submitConfirm &&
      moreThanMinuteLeft &&
      !confirm('Ready to submit this drawing?')
    )
      return;
    ID('submit').disabled = true;
    makePng(300, 250, true);
    if (options.backup)
      localStorage.setItem('anbt_drawingbackup_newcanvas', anbt.pngBase64);
    window.submitting = true;
    const url = incontest ? '/contests/submit-drawing.json' : '/play/draw.json';
    ajax('POST', url, {
      obj: {
        game_token: gameInfo.gameid,
        panel: anbt.pngBase64
      },
      load: response => {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = {
            error: response
          };
        }
        if (response.error) {
          ID('submit').disabled = false;
          if (typeof response.error === 'object')
            alert(
              `Error! Please report this data:\ngame: ${
                gameInfo.gameid
              }\n\nresponse:\n${JSON.stringify(response.error)}`
            );
          else alert(response.error);
        } else if (response.message) {
          ID('submit').disabled = false;
          alert(response.message);
        } else if (response.url) {
          window.onbeforeunload = () => {};
          anbt.unsaved = false;
          location.replace(response.url);
        }
      },
      error: () => {
        ID('submit').disabled = false;
        alert('Server error. :( Try again?');
      }
    });
  };

  const timePlus = () => {
    let { gameInfo } = window;
    if (!gameInfo.friend) return;
    ID('timeplus').disabled = true;
    ajax('POST', '/play/exit.json', {
      obj: {
        game_token: gameInfo.gameid
      },
      load: () => {
        ajax('GET', `/play/${gameInfo.gameid}/?${Date.now()}`, {
          load: response => {
            ID('timeplus').disabled = false;
            gameInfo = response
              ? extractInfoFromHTML(response)
              : {
                  error: 'Server returned a blank response :('
                };
            globals.timerStart = Date.now() + 1000 * gameInfo.timeleft;
          },
          error: () => {
            ID('timeplus').disabled = false;
            alert('Server error. :( Try again?');
          }
        });
      },
      error: () => {
        ID('timeplus').disabled = false;
        alert('Server error. :( Try again?');
      }
    });
  };

  const updateUsedChars = () => {
    ID('usedchars').textContent = 45 - ID('caption').value.length;
  };

  const bindCanvasEvents = () => {
    const { options, inforum } = window;
    if (inforum) {
      ID('quit').addEventListener('click', quit);
      const backForum = document.createElement('button');
      backForum.href = '/';
      backForum.setAttribute('class', 'submit exit');
      backForum.title = 'Exit';
      backForum.textContent = 'Exit';
      backForum.addEventListener('click', backToForum);
      ID('submit').parentNode.insertBefore(backForum, ID('submit').nextSibling);
    }
    ID('exit').addEventListener('click', exit);
    ID('skip').addEventListener('click', skip);
    ID('start').addEventListener('click', start);
    ID('report').addEventListener('click', report);
    ID('bookmark').addEventListener('click', bookmark);
    ID('submit').addEventListener('click', submitDrawing);
    ID('submitcaption').addEventListener('click', submitCaption);
    if (options.enterToCaption)
      ID('caption').addEventListener('keydown', caption);
    ID('caption').addEventListener('change', updateUsedChars);
    ID('caption').addEventListener('keydown', updateUsedChars);
    ID('caption').addEventListener('input', updateUsedChars);
    ID('timeplus').addEventListener('click', timePlus);
  };

  const handleSandboxParameters = () => {
    const { gameInfo, vertitle, options } = window;
    if (gameInfo.drawingbylink) {
      const [playername, playerlink] = gameInfo.drawingbylink;
      const replaylink = `<a href="http://grompe.org.ru/drawit/#drawception/${location.hash.substr(
        1
      )}" title="Public replay link for sharing">Drawing</a>`;
      ID(
        'headerinfo'
      ).innerHTML = `${replaylink} by <a href="${playerlink}">${playername}</a>`;
      document.title = `${playername}'s drawing - Drawception`;
      if (gameInfo.drawncaption) {
        ID('drawthis').innerHTML = `"${gameInfo.drawncaption}"`;
        ID('drawthis').classList.remove('onlyplay');
        ID('emptytitle').classList.add('onlyplay');
      }
      if (options.autoplay) play();
    } else {
      ID('headerinfo').innerHTML = `Sandbox with ${vertitle}`;
      ID('drawthis').classList.add('onlyplay');
    }
    handleCommonParameters();
  };

  const needToGoDeeper = () => {
    const { options, insandbox, panelid } = window;
    window.onerror = (error, file, line) => {
      if (error.toString().includes('periodsToSeconds')) return;
      if (error.toString().match(/script error/i)) return;
      alert(line ? `${error}\nline: ${line}` : error);
    };
    if (options.newCanvasCSS) {
      const parent =
        document.getElementsByTagName('head')[0] || document.documentElement;
      const style = document.createElement('style');
      style.type = 'text/css';
      const textNode = document.createTextNode(options.newCanvasCSS);
      style.appendChild(textNode);
      parent.appendChild(style);
    }
    if (options.enableWacom) {
      const stupidPlugin = document.createElement('object');
      const container = ID('wacomContainer');
      stupidPlugin.setAttribute('id', 'wacom');
      stupidPlugin.setAttribute('type', 'application/x-wacomtabletplugin');
      stupidPlugin.setAttribute('width', '1');
      stupidPlugin.setAttribute('height', '1');
      container.appendChild(stupidPlugin);
      if (options.fixTabletPluginGoingAWOL) fixTabletPluginGoingAwol();
    }
    bindCanvasEvents();
    if (insandbox) {
      if (panelid)
        ajax('GET', `/panel/drawing/${panelid}/-/`, {
          load: response => {
            window.gameInfo = extractInfoFromHTML(response);
            fromUrl(`${window.gameInfo.drawinglink}?anbt`);
            handleSandboxParameters();
          },
          error: () => {
            alert('Error loading the panel page. Please try again.');
          }
        });
      else {
        ajax('GET', '/sandbox/', {
          load: response => {
            window.gameInfo = extractInfoFromHTML(response);
            handleSandboxParameters();
          },
          error: () => {}
        });
        if (options.backup) {
          const pngdata = localStorage.getItem('anbt_drawingbackup_newcanvas');
          if (pngdata) {
            fromPng(base64ToBytes(pngdata.substr(22)).buffer);
            localStorage.removeItem('anbt_drawingbackup_newcanvas');
          }
        }
      }
    } else {
      ID('newcanvasyo').className = 'play';
      getParametersFromPlay();
    }
    if (/iPad|iPhone/.test(navigator.userAgent)) anbt.fastUndoLevels = 3;
    window.$ = () => {
      alert(
        'Some additional script conflicts with ANBT new canvas, please disable it.'
      );
      window.$ = null;
      throw new Error('Script conflict with ANBT new canvas');
    };
  };

  window.needToGoDeeper = needToGoDeeper;
  if (!window.options) window.options = {};
  anbt.bindContainer(ID('svgContainer'));
  bindEvents();
  globals.timerStart = Date.now();
  setInterval(updateTimer, 500);
  if (window.anbtReady) window.anbtReady();
})();
