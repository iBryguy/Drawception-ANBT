import addToSvg from './functions/anbt/addToSvg'
import bindContainer from './functions/anbt/bindContainer'
import clearWithColor from './functions/anbt/clearWithColor'
import cutHistoryBeforeClearAndAfterPosition from './functions/anbt/cutHistoryBeforeClearAndAfterPosition'
import drawDispLine from './functions/anbt/drawDispLine'
import drawDispLinePresto from './functions/anbt/drawDispLinePresto'
import drawSvgElement from './functions/anbt/drawSvgElement'
import eyedropper from './functions/anbt/eyedropper'
import findLastRect from './functions/anbt/findLastRect'
import fromLocalFile from './functions/anbt/fromLocalFile'
import fromPng from './functions/anbt/fromPng'
import fromUrl from './functions/anbt/fromUrl'
import getSeekMax from './functions/anbt/getSeekMax'
import lock from './functions/anbt/lock'
import makePng from './functions/anbt/makePng'
import moveCursor from './functions/anbt/moveCursor'
import moveSeekbar from './functions/anbt/moveSeekbar'
import packPlayback from './functions/anbt/packPlayback'
import pause from './functions/anbt/pause'
import play from './functions/anbt/play'
import playTimer from './functions/anbt/playTimer'
import redo from './functions/anbt/redo'
import requestSave from './functions/anbt/requestSave'
import seek from './functions/anbt/seek'
import setBackground from './functions/anbt/setBackground'
import setColor from './functions/anbt/setColor'
import setSeekbarMove from './functions/anbt/setSeekbarMove'
import setSize from './functions/anbt/setSize'
import showEyedropperCursor from './functions/anbt/showEyedropperCursor'
import strokeAdd from './functions/anbt/strokeAdd'
import strokeBegin from './functions/anbt/strokeBegin'
import strokeEnd from './functions/anbt/strokeEnd'
import undo from './functions/anbt/undo'
import unlock from './functions/anbt/unlock'
import unpackPlayback from './functions/anbt/unpackPlayback'
import updateView from './functions/anbt/updateView'
import uploadToImgur from './functions/anbt/uploadToImgur'
import createSvgElement from './functions/createSvgElement'
import palettes from './palettes'

const anbt = {
  container: null,
  svg: createSvgElement('svg', {
    // Even though Opera complains to have failed to set xmlns attribute:
    // > Failed attribute on svg element: xmlns="http://www.w3.org/2000/svg".
    // this is necessary for loading a saved SVG which otherwise wouldn't
    // bind correct prototypes for functions such as path.pathSegList
    xmlns: 'http://www.w3.org/2000/svg',
    version: '1.1',
    width: '600',
    height: '500'
  }),
  canvas: document.createElement('canvas'),
  canvasDisp: document.createElement('canvas'),
  svgDisp: createSvgElement('svg', {
    //xmlns: "http://www.w3.org/2000/svg",
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
}

export default anbt