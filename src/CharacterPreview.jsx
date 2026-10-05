import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import {
  findFirstSkinnedMesh,
  findHipsBone,
  pinHipsXZ,
  retargetClipToBones,
  pickRunClip,
  stripHipRootMotion,
} from './mixamoAnimation.js'

/** Pack run cycle (same as in-game). */
const DEFAULT_RUN_ANIM = new URL(
  '../Characters/TestCharacter/Animations/run.fbx',
  import.meta.url
).href

/**
 * Scales a loaded character to fit the preview (smaller than in-game 1.7m).
 */
function fitPreviewModel(root, previewKind = 'character') {
  const extras = []
  root.traverse((o) => {
    if (o.isCamera || o.isLight) extras.push(o)
    if (o.isMesh) {
      o.castShadow = true
    }
  })
  for (const extra of extras) extra.parent?.remove(extra)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = size.y
  const maxD = Math.max(size.x, size.y, size.z, 0.001)
  const targetH = previewKind === 'vehicle' ? 0.72 : 0.92
  const s =
    previewKind === 'vehicle'
      ? targetH / maxD
      : h > 0.01
        ? targetH / h
        : targetH / maxD
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.rotation.set(0, Math.PI, 0)
  return root
}

/**
 * @param {THREE.Object3D} root
 * @param {string} skinUrl
 * @param {THREE.TextureLoader} textureLoader
 */
function applyPreviewSkin(root, skinUrl, textureLoader) {
  return new Promise((resolve) => {
    if (!skinUrl) {
      resolve()
      return
    }
    textureLoader.load(
      skinUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        root.traverse((o) => {
          if (!o.isMesh || !o.material) return
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) {
            m.map = tex
            m.needsUpdate = true
          }
        })
        resolve()
      },
      undefined,
      () => resolve()
    )
  })
}

/**
 * Small rotating 3D preview (options menu): GLB or FBX + optional skin + run clip.
 */
export function CharacterPreview({
  modelUrl,
  format = 'gltf',
  skinUrl,
  runAnimUrl = DEFAULT_RUN_ANIM,
  previewKind = 'character',
  animateRun = true,
  className = '',
}) {
  const wrapRef = useRef(null)
  const combinedClass = `character-preview-canvas${className ? ` ${className}` : ''}`

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    let animId = 0
    let cancelled = false
    let currentRoot = null
    let previewMixer = null
    let previewHips = null
    /** @type {{ x: number, z: number } | null} */
    let previewHipsBind = null
    const animClock = new THREE.Clock()

    const gltfLoader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    )
    gltfLoader.setDRACOLoader(dracoLoader)
    const fbxLoader = new FBXLoader()
    const textureLoader = new THREE.TextureLoader()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x101010)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.08, 12)
    camera.position.set(0.42, 0.5, 1.12)
    camera.lookAt(0, 0.45, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const setSize = () => {
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    setSize()
    wrap.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xa8a8b8, 0x2a2a32, 0.88)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xffffff, 0.95)
    key.position.set(0.6, 1.0, 0.75)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xc8d0e0, 0.35)
    fill.position.set(-0.8, 0.35, 0.2)
    scene.add(fill)

    const spin = new THREE.Group()
    scene.add(spin)

    const disposePreviewAnim = () => {
      if (previewMixer) {
        if (currentRoot) {
          previewMixer.stopAllAction()
          previewMixer.uncacheRoot(currentRoot)
        } else {
          previewMixer.stopAllAction()
        }
        previewMixer = null
      }
    }

    const tryWireRun = (root) => {
      const url = runAnimUrl || DEFAULT_RUN_ANIM
      const onClip = (clip) => {
        if (cancelled || !root || !currentRoot) return
        const sm = findFirstSkinnedMesh(root)
        if (!clip || !sm?.skeleton) return
        const retargeted = stripHipRootMotion(
          retargetClipToBones(clip, sm.skeleton)
        )
        if (retargeted.tracks.length === 0) {
          if (import.meta.env.DEV) {
            console.warn(
              '[CharacterPreview] No tracks retargeted for run animation'
            )
          }
          return
        }
        disposePreviewAnim()
        previewHips = findHipsBone(root)
        previewHipsBind = previewHips
          ? { x: previewHips.position.x, z: previewHips.position.z }
          : null
        previewMixer = new THREE.AnimationMixer(root)
        const run = previewMixer.clipAction(retargeted)
        run.setLoop(THREE.LoopRepeat, Infinity)
        run.clampWhenFinished = false
        run.play()
        animClock.start()
      }
      if (/\.fbx$/i.test(url)) {
        fbxLoader.load(
          url,
          (g) => onClip(pickRunClip(g.animations)),
          undefined,
          (err) => {
            if (import.meta.env.DEV)
              console.warn('[CharacterPreview] run.fbx load failed', err)
          }
        )
      } else {
        gltfLoader.load(
          url,
          (gltf) => onClip(pickRunClip(gltf.animations)),
          undefined,
          (err) => {
            if (import.meta.env.DEV)
              console.warn('[CharacterPreview] run anim load failed', err)
          }
        )
      }
    }

    const mountModel = (object3d) => {
      if (cancelled) return
      disposePreviewAnim()
      if (currentRoot) {
        spin.remove(currentRoot)
      }
      currentRoot = fitPreviewModel(object3d, previewKind)
      spin.add(currentRoot)
      const afterSkin = () => {
        if (cancelled || !currentRoot) return
        if (animateRun) tryWireRun(currentRoot)
      }
      if (skinUrl) {
        applyPreviewSkin(currentRoot, skinUrl, textureLoader).then(afterSkin)
      } else {
        afterSkin()
      }
    }

    if (format === 'fbx') {
      fbxLoader.load(
        modelUrl,
        (group) => mountModel(group),
        undefined,
        () => {
          if (cancelled) return
        }
      )
    } else {
      gltfLoader.load(
        modelUrl,
        (gltf) => mountModel(gltf.scene),
        undefined,
        () => {
          if (cancelled) return
        }
      )
    }

    const tick = () => {
      animId = requestAnimationFrame(tick)
      const ad = animClock.getDelta()
      if (previewMixer) {
        previewMixer.update(ad)
        pinHipsXZ(previewHips, previewHipsBind)
      }
      spin.rotation.y += 0.01
      renderer.render(scene, camera)
    }
    tick()

    const ro = new ResizeObserver(() => {
      setSize()
    })
    ro.observe(wrap)

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      if (previewMixer) {
        if (currentRoot) {
          previewMixer.stopAllAction()
          previewMixer.uncacheRoot(currentRoot)
        } else {
          previewMixer.stopAllAction()
        }
        previewMixer = null
      }
      ro.disconnect()
      if (currentRoot) {
        currentRoot.traverse((o) => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) {
            if (Array.isArray(o.material)) {
              o.material.forEach((m) => m.dispose())
            } else {
              o.material.dispose()
            }
          }
        })
        spin.remove(currentRoot)
        currentRoot = null
      }
      dracoLoader.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === wrap) {
        wrap.removeChild(renderer.domElement)
      }
    }
  }, [modelUrl, format, skinUrl, runAnimUrl, previewKind, animateRun])

  return <div className={combinedClass} ref={wrapRef} />
}
