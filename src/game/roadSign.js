// roadSign.js — Procedural roadside sign with canvas text.

import * as THREE from 'three'

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 */
function paintSignText(ctx, canvas, text) {
  ctx.fillStyle = '#1a6b38'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#f5f0dc'
  ctx.lineWidth = 10
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)
  ctx.fillStyle = '#f8f6ee'
  ctx.font = 'bold 52px system-ui, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
}

/**
 * @param {THREE.Object3D} sign
 * @param {string} text
 */
export function setNextLevelSignText(sign, text) {
  const canvas = sign.userData.signCanvas
  const texture = sign.userData.signTexture
  if (!canvas || !texture) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  paintSignText(ctx, canvas, text)
  texture.needsUpdate = true
}

/**
 * @param {THREE.Group} parent
 * @param {{ localZ: number, side?: 1 | -1, text?: string }} opts
 */
export function buildNextLevelSign(parent, opts) {
  const { localZ, side = 1, text = 'Next Level 2' } = opts
  const sign = new THREE.Group()
  sign.name = 'nextLevelSign'

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a52,
    roughness: 0.65,
    metalness: 0.2,
  })
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 3.4, 10),
    postMat
  )
  post.position.set(0, 1.7, 0)
  post.castShadow = true
  sign.add(post)

  const boardW = 3.6
  const boardH = 1.35
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const ctx = canvas.getContext('2d')
  if (ctx) paintSignText(ctx, canvas, text)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const boardMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.05,
  })
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(boardW, boardH),
    boardMat
  )
  board.position.set(0, 3.55, 0.06)
  board.castShadow = true
  sign.add(board)

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(boardW + 0.14, boardH + 0.14, 0.08),
    postMat
  )
  frame.position.set(0, 3.55, 0)
  sign.add(frame)

  const x = side * (4.2 + 0.5)
  sign.position.set(x, 0, localZ)
  sign.rotation.y = side < 0 ? Math.PI * 0.12 : -Math.PI * 0.12

  sign.userData.signCanvas = canvas
  sign.userData.signTexture = texture
  sign.userData.disposeSign = () => {
    texture.dispose()
    postMat.dispose()
    boardMat.dispose()
    post.geometry.dispose()
    board.geometry.dispose()
    frame.geometry.dispose()
  }

  parent.add(sign)
  return sign
}
