// Taller 3D de la demo: la P2S del recorrido original, girable con puntero, táctil o teclado.
// Las etapas fijan el instante del clip `Atelier_Scroll` y llevan la cámara a la pose de scroll-scene.json.
import {
  AgXToneMapping,
  AnimationMixer,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  LoopOnce,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SpotLight,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"
import { EXRLoader } from "three/addons/loaders/EXRLoader.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { escena, url } from "./escena"

export type Taller = { irA: (id: string) => void; avance: (p: number) => void }

/** Monta el visor en `marco`. Lanza si no hay WebGL o falla el GLB: quien llama conserva el póster. */
export async function montarTaller(marco: HTMLElement, alCargar: (fraccion: number) => void): Promise<Taller> {
  const lienzo = marco.querySelector<HTMLCanvasElement>("canvas")!
  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true })

  const [gltf, entorno] = await Promise.all([
    new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      // Igual que en recorrido.ts: la nota de texto en `extras.pivot` dejaría carretes y puerta invisibles.
      .register((parser) => {
        for (const nodo of parser.json.nodes) if (typeof nodo.extras?.pivot === "string") delete nodo.extras.pivot
        return { name: "ATELIER_notas_pivot" }
      })
      .loadAsync(url(escena.model), (e) => e.total && alCargar(e.loaded / e.total)),
    new EXRLoader().loadAsync(url(escena.environment)).catch(() => null),
  ]).catch((error) => {
    renderer.dispose()
    throw error
  })
  const clip = gltf.animations.find((item) => item.name === escena.clip)
  if (!clip) throw new Error("El GLB no trae el clip Atelier_Scroll")

  // —— Entorno y luces: los mismos valores que el recorrido original ——
  const mundo = new Scene()
  mundo.add(gltf.scene)
  const estudio = new Scene()
  if (entorno) {
    entorno.mapping = EquirectangularReflectionMapping
    estudio.background = entorno
    estudio.backgroundIntensity = 0.18
  } else estudio.background = new Color(0x101723)
  for (const [posicion, ancho, alto, intensidad] of [
    [[-1.6, 1.6, 1.5], 0.35, 1.2, 2.8],
    [[1.3, 0.85, 0.4], 0.18, 1.4, 2.5],
    [[0, 1.8, -0.3], 1.2, 0.3, 1.8],
  ] as const) {
    const panel = new Mesh(new PlaneGeometry(ancho, alto), new MeshBasicMaterial({ color: new Color(0xe9efff).multiplyScalar(intensidad) }))
    panel.position.set(...posicion)
    panel.lookAt(0, 0.35, 0)
    estudio.add(panel)
  }
  const pmrem = new PMREMGenerator(renderer)
  mundo.environment = pmrem.fromScene(estudio, 0.04, 0.1, 10).texture
  mundo.environmentIntensity = 0.8
  pmrem.dispose()
  estudio.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return
    objeto.geometry.dispose()
    ;(objeto.material as Material).dispose()
  })
  entorno?.dispose()

  gltf.scene.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return
    for (const material of [objeto.material].flat()) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
      if (material instanceof MeshStandardMaterial && material.name === "Atelier · plinto azul") {
        material.color.set(0x070e1c)
        material.roughness = 0.75
      }
    }
    const opaco = [objeto.material].flat().every((m) => !m.transparent && (!("transmission" in m) || m.transmission === 0))
    objeto.castShadow = opaco && !objeto.userData.surface_decal
    objeto.receiveShadow = opaco
  })

  const principal = new DirectionalLight(0xf1f4ff, 2.1)
  principal.position.set(-0.73, 1.32, 0.95)
  principal.target.position.set(0, 0.35, 0)
  principal.castShadow = true
  principal.shadow.mapSize.set(2048, 2048)
  principal.shadow.radius = 5
  principal.shadow.bias = -0.0004
  principal.shadow.normalBias = 0.0006
  Object.assign(principal.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.3, far: 4 })
  principal.shadow.camera.updateProjectionMatrix()
  const relleno = new DirectionalLight(0xb9ccff, 0.35)
  relleno.position.set(0.66, 0.68, 0.7)
  const contorno = new DirectionalLight(0xe5edff, 1.8)
  contorno.position.set(0.47, 1.12, -0.59)
  const placa = new SpotLight(0xffdfab, 0.13, 0, 1.15, 1, 2)
  placa.position.set(-0.075, 0.398, 0.176)
  placa.target.position.set(0, 0.35, 0.056)
  placa.castShadow = true
  placa.shadow.radius = 6
  placa.shadow.bias = -0.002
  placa.shadow.normalBias = 0.001
  Object.assign(placa.shadow.camera, { near: 0.02, far: 1 })
  mundo.add(principal, principal.target, relleno, contorno, placa, placa.target)

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = AgXToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap

  // —— Clip: el avance lo decide el visitante, nunca corre solo ——
  const mixer = new AnimationMixer(gltf.scene)
  const accion = mixer.clipAction(clip).setLoop(LoopOnce, 0).play()
  accion.paused = true

  // —— Cámara libre: arranca en la pose de portada ——
  const camara = new PerspectiveCamera(escena.cameraVerticalFovDeg, 1, 0.01, 20)
  const controles = new OrbitControls(camara, lienzo)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minDistance = 0.08
  controles.maxDistance = 2.6
  controles.maxPolarAngle = Math.PI * 0.52 // no se mete bajo el plinto
  controles.listenToKeyEvents(lienzo) // flechas con el lienzo enfocado
  controles.keyRotateSpeed = 1.5
  controles.rotateSpeed = 0.7

  const poses = Object.fromEntries(escena.stages.map((e) => [e.id, e]))
  let p = 0
  const viaje = { activo: false, t: 0, desdeP: 0, hastaP: 0, desdePos: new Vector3(), hastaPos: new Vector3(), desdeObj: new Vector3(), hastaObj: new Vector3() }
  const suave = matchMedia("(prefers-reduced-motion: no-preference)").matches

  function fijarAvance(valor: number) {
    p = MathUtils.clamp(valor, 0, 1)
    accion.time = p * clip!.duration
    mixer.update(0)
  }

  function irA(id: string) {
    const pose = poses[id]
    if (!pose) return
    Object.assign(viaje, { activo: true, t: suave ? 0 : 1, desdeP: p, hastaP: pose.progress })
    viaje.desdePos.copy(camara.position)
    viaje.hastaPos.fromArray(pose.cameraPosition)
    viaje.desdeObj.copy(controles.target)
    viaje.hastaObj.fromArray(pose.cameraTarget)
  }

  const pose0 = poses.portada
  camara.position.fromArray(pose0.cameraPosition)
  controles.target.fromArray(pose0.cameraTarget)
  fijarAvance(0)

  function medir() {
    const { clientWidth: w, clientHeight: h } = marco
    renderer.setSize(w, h, false)
    camara.aspect = w / h
    // En vertical se aleja el encuadre para que la impresora quepa a lo ancho.
    camara.zoom = Math.min(1, (w / h) * 0.95)
    camara.updateProjectionMatrix()
  }
  new ResizeObserver(medir).observe(marco)
  medir()

  let ultimo = performance.now()
  renderer.setAnimationLoop((ahora) => {
    const dt = Math.min((ahora - ultimo) / 1000, 0.1)
    ultimo = ahora
    if (viaje.activo) {
      viaje.t = Math.min(1, viaje.t + dt / 1.1)
      const k = MathUtils.smootherstep(viaje.t, 0, 1)
      fijarAvance(MathUtils.lerp(viaje.desdeP, viaje.hastaP, k))
      camara.position.lerpVectors(viaje.desdePos, viaje.hastaPos, k)
      controles.target.lerpVectors(viaje.desdeObj, viaje.hastaObj, k)
      if (viaje.t >= 1) viaje.activo = false
    }
    controles.update()
    renderer.render(mundo, camara)
  })
  // Si el visitante arrastra a mitad de un viaje, manda el visitante.
  controles.addEventListener("start", () => (viaje.activo = false))

  marco.classList.add("es-3d")
  Object.assign(window, { __taller: { camara, controles, renderer, mundo, get avance() { return p } } }) // inspección en pruebas
  return { irA, avance: fijarAvance }
}
