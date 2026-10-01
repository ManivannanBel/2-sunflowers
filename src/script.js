import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

/**
 * Ground
 */
const groundGeometry = new THREE.PlaneGeometry(100, 100, 100, 100)
const perlin = new ImprovedNoise()

// Perlin-noise terrain height at a given WORLD (x, z) position, faded out
// near the center so the sunflowers stay planted on flat ground. Shared by
// the ground mesh below and by anything else (e.g. scattered plants) that
// needs to sit correctly on the terrain's surface.
const getTerrainHeight = (x, z) => {
    const localY = -z // the ground is rotated -90 deg around X, see below

    const noiseValue = perlin.noise(x * 0.05, localY * 0.05, 0) + perlin.noise(x * 0.15, localY * 0.15, 10) * 0.3

    const distanceFromCenter = Math.sqrt(x * x + z * z)
    const falloff = THREE.MathUtils.smoothstep(distanceFromCenter, 3, 12)

    return noiseValue * falloff * 1.2
}

// Displace the ground vertices to form rolling terrain using the helper
// above (plane-local x/y map to world x/-z before the rotation below).
const groundPositions = groundGeometry.attributes.position
for (let i = 0; i < groundPositions.count; i++) {
    const localX = groundPositions.getX(i)
    const localY = groundPositions.getY(i)

    groundPositions.setZ(i, getTerrainHeight(localX, -localY))
}
groundGeometry.computeVertexNormals()

const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({ color: 0x22a829, roughness: 0.9 })
)
ground.rotation.x = -Math.PI * 0.5
ground.receiveShadow = true
scene.add(ground)

/**
 * Sunflower
 */
const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: 0 })
const petalTipMaterial = new THREE.MeshStandardMaterial({ color: 0xffb703, emissive: 0xffb703, emissiveIntensity: 0 })
const centerMaterial = new THREE.MeshStandardMaterial({ color: 0x7a4a24, emissive: 0xffb703, emissiveIntensity: 0 })
const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50 })
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2b2b })
const eyeHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xff9aa8 })
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x523a46 })

const createSunflower = (x, z, rotationOffset = 0) => {
    const group = new THREE.Group()

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 1.4, 8),
        stemMaterial
    )
    stem.position.y = 0.7
    stem.castShadow = true
    group.add(stem)

    // Leaves
    for (let i = 0; i < 2; i++) {
        const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            stemMaterial
        )
        leaf.scale.set(1, 0.3, 2)
        leaf.position.set(
            Math.cos(i * Math.PI) * 0.2,
            0.5 + i * 0.2,
            Math.sin(i * Math.PI) * 0.2
        )
        leaf.rotation.y = i * Math.PI
        leaf.castShadow = true
        group.add(leaf)
    }

    // Flower head (center + petals)
    const head = new THREE.Group()
    head.position.y = 1.4
    head.position.z = 0.05 // slight forward tilt so the face is visible from the front

    const center = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.09, 24),
        centerMaterial
    )
    center.rotation.x = Math.PI * 0.5
    center.castShadow = true
    head.add(center)

    // Cute face on the center
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMaterial)
    leftEye.position.set(-0.08, 0.03, 0.05)
    const rightEye = leftEye.clone()
    rightEye.position.x = 0.08
    head.add(leftEye, rightEye)

    const leftHighlight = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), eyeHighlightMaterial)
    leftHighlight.position.set(-0.07, 0.04, 0.07)
    const rightHighlight = leftHighlight.clone()
    rightHighlight.position.x = 0.09
    head.add(leftHighlight, rightHighlight)

    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), cheekMaterial)
    leftCheek.scale.set(1, 0.6, 0.4)
    leftCheek.position.set(-0.13, -0.02, 0.04)
    const rightCheek = leftCheek.clone()
    rightCheek.position.x = 0.13
    head.add(leftCheek, rightCheek)

    const mouth = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.008, 8, 16, Math.PI),
        mouthMaterial
    )
    mouth.rotation.z = Math.PI
    mouth.position.set(0, -0.03, 0.06)
    head.add(mouth)

    const petalCount = 14
    for (let i = 0; i < petalCount; i++) {
        const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 10),
            i % 2 === 0 ? petalMaterial : petalTipMaterial
        )
        petal.scale.set(0.55, 1.5, 0.28)
        const angle = (i / petalCount) * Math.PI * 2
        petal.position.set(Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, 0)
        petal.rotation.z = angle - Math.PI / 2
        petal.castShadow = true
        head.add(petal)
    }

    group.add(head)

    group.position.set(x, 0, z)
    group.rotation.y = rotationOffset

    return { group, head }
}

const sunflower1 = createSunflower(-0.6, 0, 10)
const sunflower2 = createSunflower(0.6, -0.3, 10)
scene.add(sunflower1.group, sunflower2.group)

/**
 * Background plants scattered across the terrain
 *
 * `PLANT_DENSITY` controls how many little bushes are scattered per square
 * unit of ground - tweak this single number to make the terrain sparser or
 * lusher.
 */
const PLANT_DENSITY = 0.05 // plants per square unit, within the planted ring below

const plantAreaOuterRadius = 45 // stay inside the 100x100 ground, away from its edges
const plantAreaInnerRadius = 4 // keep the area around the sunflowers clear

const plantArea = Math.PI * (plantAreaOuterRadius ** 2 - plantAreaInnerRadius ** 2)
const plantCount = Math.round(plantArea * PLANT_DENSITY)

const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8f3b })
const plantGeometry = new THREE.IcosahedronGeometry(0.3, 1)
const plants = new THREE.InstancedMesh(plantGeometry, plantMaterial, plantCount)
plants.castShadow = true
plants.receiveShadow = true

const plantDummy = new THREE.Object3D()
for (let i = 0; i < plantCount; i++) {
    // Uniformly sample a ring around the sunflowers (sqrt spreads points
    // evenly by area rather than bunching them up near the inner edge).
    const angle = Math.random() * Math.PI * 2
    const radius = THREE.MathUtils.lerp(
        plantAreaInnerRadius,
        plantAreaOuterRadius,
        Math.sqrt(Math.random())
    )
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    plantDummy.position.set(x, getTerrainHeight(x, z) + 0.15, z)
    plantDummy.rotation.y = Math.random() * Math.PI * 2
    const scale = THREE.MathUtils.lerp(0.5, 1.3, Math.random())
    plantDummy.scale.set(scale, scale * THREE.MathUtils.lerp(0.7, 1.4, Math.random()), scale)
    plantDummy.updateMatrix()

    plants.setMatrixAt(i, plantDummy.matrix)
}
scene.add(plants)

/**
 * Camera framing (defined early so the sun can be placed relative to it)
 */
const flowerHeadHeight = 1.4
const cameraTarget = new THREE.Vector3(
    (sunflower1.group.position.x + sunflower2.group.position.x) / 2,
    flowerHeadHeight,
    (sunflower1.group.position.z + sunflower2.group.position.z) / 2
)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
scene.add(ambientLight)

// Direction the sun shines from (also used to place the visible sun). Derived
// from a fixed reference bearing (not the live camera position), because the
// sunflowers turn to face this direction during the day - see cameraPosition
// below, which deliberately sits on the same side so we see their faces.
const sunDirection = cameraTarget.clone()
    .sub(new THREE.Vector3(2, 2, 3))
    .normalize()
    .add(new THREE.Vector3(0, 0.45, 0))
    .normalize()

// The sunflowers face the sun once day settles in, so to see their faces
// (instead of the backs of their heads) the camera has to stand on that same
// side, looking back towards them.
const cameraPosition = cameraTarget.clone()
    .add(sunDirection.clone().multiplyScalar(cameraTarget.distanceTo(new THREE.Vector3(2, 2, 3))))

const sunLight = new THREE.DirectionalLight(0xfff4e0, 2)
sunLight.position.copy(sunDirection).multiplyScalar(8)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(1024, 1024)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 20
sunLight.shadow.camera.left = -5
sunLight.shadow.camera.right = 5
sunLight.shadow.camera.top = 5
sunLight.shadow.camera.bottom = -5
scene.add(sunLight)

/**
 * Visible sun
 */
const sunPosition = sunDirection.clone().multiplyScalar(30)

// Soft glow halo behind the sun disc
const glowCanvas = document.createElement('canvas')
glowCanvas.width = 256
glowCanvas.height = 256
const glowContext = glowCanvas.getContext('2d')
const gradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128)
gradient.addColorStop(0, 'rgba(255, 244, 200, 1)')
gradient.addColorStop(0.4, 'rgba(255, 220, 130, 0.5)')
gradient.addColorStop(1, 'rgba(255, 200, 100, 0)')
glowContext.fillStyle = gradient
glowContext.fillRect(0, 0, 256, 256)
const glowTexture = new THREE.CanvasTexture(glowCanvas)

const sunGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const sunGlow = new THREE.Sprite(sunGlowMaterial)
sunGlow.scale.set(14, 14, 1)
sunGlow.position.copy(sunPosition)
scene.add(sunGlow)

// Bright sun disc (unlit so it always reads as a glowing light source)
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true })
const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 20), sunMaterial)
sun.position.copy(sunPosition)
scene.add(sun)

/**
 * Lens flare
 *
 * A big soft flare at the sun itself, plus a handful of small coloured
 * "ghost" dots strung out across the screen towards its center. Attached to
 * the light so it automatically follows the sun as it moves.
 */
const flareDotCanvas = document.createElement('canvas')
flareDotCanvas.width = 128
flareDotCanvas.height = 128
const flareDotContext = flareDotCanvas.getContext('2d')
const flareDotGradient = flareDotContext.createRadialGradient(64, 64, 0, 64, 64, 64)
flareDotGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
flareDotGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
flareDotContext.fillStyle = flareDotGradient
flareDotContext.fillRect(0, 0, 128, 128)
const flareDotTexture = new THREE.CanvasTexture(flareDotCanvas)

const lensflare = new Lensflare()
const lensflareElements = []

const addFlareElement = (texture, size, distance, color) => {
    const element = new LensflareElement(texture, size, distance, color.clone())
    lensflare.addElement(element)
    lensflareElements.push({ element, baseColor: color })
}

addFlareElement(glowTexture, 350, 0, new THREE.Color(0xfff4d6))
addFlareElement(flareDotTexture, 60, 0.3, new THREE.Color(0xffe9a8))
addFlareElement(flareDotTexture, 30, 0.5, new THREE.Color(0xaed4ff))
addFlareElement(flareDotTexture, 80, 0.8, new THREE.Color(0xffc8a8))
addFlareElement(flareDotTexture, 20, 1, new THREE.Color(0xffffff))

sunLight.add(lensflare)

/**
 * Night sky stars
 *
 * `STAR_DENSITY` is simply the total number of stars scattered across the
 * sky dome - tweak this one number for a sparser or denser starfield.
 */
const STAR_DENSITY = 2000

const starRadius = 80 // inside the camera's far plane (100), well beyond the sun's arc (30)
const starPositions = new Float32Array(STAR_DENSITY * 3)
for (let i = 0; i < STAR_DENSITY; i++) {
    // Uniformly distributed points on a sphere, kept above the horizon
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, Math.random()))

    starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * starRadius
    starPositions[i * 3 + 1] = Math.abs(Math.cos(phi)) * starRadius
    starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * starRadius
}

const starGeometry = new THREE.BufferGeometry()
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))

const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false
})
const stars = new THREE.Points(starGeometry, starMaterial)
scene.add(stars)

/**
 * Daytime clouds
 *
 * `CLOUD_COUNT` is simply how many cloud sprites drift across the sky -
 * tweak this one number for a sparser or cloudier sky. They fade out as
 * night falls, alongside the sun.
 */
const CLOUD_COUNT = 14

// A soft puffy cloud blob, built from a handful of overlapping radial
// gradients on a single canvas texture
const cloudCanvas = document.createElement('canvas')
cloudCanvas.width = 256
cloudCanvas.height = 160
const cloudContext = cloudCanvas.getContext('2d')
const cloudPuffs = [
    { x: 128, y: 95, r: 70 },
    { x: 75, y: 100, r: 50 },
    { x: 185, y: 100, r: 55 },
    { x: 100, y: 60, r: 45 },
    { x: 165, y: 65, r: 42 }
]
for (const puff of cloudPuffs) {
    const puffGradient = cloudContext.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r)
    puffGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    puffGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    cloudContext.fillStyle = puffGradient
    cloudContext.fillRect(0, 0, 256, 160)
}
const cloudTexture = new THREE.CanvasTexture(cloudCanvas)

const cloudAreaRadius = 35
const clouds = []
for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        depthWrite: false
    }))

    const angle = Math.random() * Math.PI * 2
    const radius = THREE.MathUtils.lerp(5, cloudAreaRadius, Math.random())
    const scale = THREE.MathUtils.lerp(6, 14, Math.random())

    cloud.position.set(Math.cos(angle) * radius, THREE.MathUtils.lerp(9, 10, Math.random()), Math.sin(angle) * radius)
    cloud.scale.set(scale, scale * 0.6, 1)
    cloud.userData.driftSpeed = THREE.MathUtils.lerp(0.6, 1.4, Math.random()) * (Math.random() < 0.5 ? 1 : -1)

    clouds.push(cloud)
    scene.add(cloud)
}

/**
 * Day / night cycle
 *
 * The sun swings along a half-circle arc (through the axis perpendicular to
 * its day direction) so "night" places it diametrically opposite - below the
 * horizon - while smoothly passing through the sky in between.
 */
const sunAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunDirection).normalize()
const sunDistanceLight = 8
const sunDistanceVisual = 30

const dayNight = {
    isNight: false,
    progress: 0, // 0 = day, 1 = night
    target: 0
}

const dayColors = {
    background: new THREE.Color(0x87ceeb),
    ground: new THREE.Color(0x6b8e4e),
    sunLight: new THREE.Color(0xfff4e0),
    ambientIntensity: 0.3,
    sunIntensity: 2
}

const nightColors = {
    background: new THREE.Color(0x0b1026),
    ground: new THREE.Color(0x1b2a24),
    sunLight: new THREE.Color(0x9db4ff),
    ambientIntensity: 0.08,
    sunIntensity: 0.15
}

scene.background = dayColors.background.clone()

const toggleButton = document.querySelector('.day-night-toggle')
toggleButton.addEventListener('click', () => {
    dayNight.isNight = !dayNight.isNight
    dayNight.target = dayNight.isNight ? 1 : 0
    toggleButton.textContent = dayNight.isNight ? '☀️ Switch to Day' : '🌙 Switch to Night'
})

// Rotates `object` purely around the vertical stem axis (Y) so it smoothly
// eases towards yawing at `targetWorldPosition` (offset by `angleOffset`
// radians, if given), without any pitch or roll tilt. Any existing X/Z
// rotation (e.g. a wind sway) is left untouched. Returns how far off (in
// radians) the rotation still is from its target, so callers can tell once
// it's actually finished turning.
const turnSpeed = 1.5 // how quickly the yaw eases towards its target, per second
const faceTowards = (object, targetWorldPosition, deltaTime, angleOffset = 0) => {
    const localTarget = object.parent.worldToLocal(targetWorldPosition.clone())
    const dx = localTarget.x - object.position.x
    const dz = localTarget.z - object.position.z
    const targetAngle = Math.atan2(dx, dz) + angleOffset

    // Shortest angular distance to the target, wrapped to [-PI, PI]
    const twoPi = Math.PI * 2
    let angleDiff = (targetAngle - object.rotation.y) % twoPi
    if (angleDiff > Math.PI) angleDiff -= twoPi
    if (angleDiff < -Math.PI) angleDiff += twoPi

    object.rotation.y += angleDiff * Math.min(deltaTime * turnSpeed, 1)

    return angleDiff
}

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.copy(cameraPosition)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.target.copy(cameraTarget)
controls.enableDamping = true

// TEMP: logs the live camera position while you orbit/pan/zoom, so you can
// find a new spot and copy its values into `cameraPosition` above.
// Remove this once you've picked the position you want.
controls.addEventListener('change', () => {
    console.log('camera position:', camera.position.toArray().map(n => n.toFixed(2)))
})

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true

/**
 * Animate
 */
const clock = new THREE.Clock()

let elapsedTime = 0
let facingEachOtherSettled = false // true once both sunflowers finish turning to face each other
let glowAmount = 0 // eased petal/head glow intensity

const tick = () => {
    const deltaTime = clock.getDelta()
    elapsedTime += deltaTime

    // Gentle swaying of the sunflowers
    sunflower1.group.rotation.z = Math.sin(elapsedTime * 0.5) * 0.05
    sunflower2.group.rotation.z = Math.sin(elapsedTime * 0.5 + 1) * 0.05

    // Ease the day/night progress towards its target
    dayNight.progress += (dayNight.target - dayNight.progress) * Math.min(deltaTime * 1.5, 1)
    const progress = dayNight.progress

    // Move the sun along its arc (day position -> horizon -> night position)
    const currentSunDirection = sunDirection.clone().applyAxisAngle(sunAxis, progress * Math.PI)
    sunLight.position.copy(currentSunDirection).multiplyScalar(sunDistanceLight)
    const currentSunPosition = currentSunDirection.clone().multiplyScalar(sunDistanceVisual)
    sun.position.copy(currentSunPosition)
    sunGlow.position.copy(currentSunPosition)

    // Fade the sun's visuals out as it dips below the horizon
    const sunOpacity = THREE.MathUtils.clamp(1 - progress * 1.6, 0, 1)
    sunMaterial.opacity = sunOpacity
    sunGlowMaterial.opacity = sunOpacity
    for (const { element, baseColor } of lensflareElements) {
        element.color.copy(baseColor).multiplyScalar(sunOpacity)
    }

    // Fade the stars in as night falls
    starMaterial.opacity = THREE.MathUtils.smoothstep(progress, 0.4, 1)

    // Drift the clouds across the sky and fade them out as night falls,
    // alongside the sun
    const cloudOpacity = THREE.MathUtils.clamp(1 - progress * 1.3, 0, 1)
    const cloudBound = cloudAreaRadius + 5
    for (const cloud of clouds) {
        cloud.material.opacity = cloudOpacity
        cloud.position.x += cloud.userData.driftSpeed * deltaTime
        if (cloud.position.x > cloudBound) cloud.position.x = -cloudBound
        if (cloud.position.x < -cloudBound) cloud.position.x = cloudBound
    }

    // Sunflowers only re-target once the day/night transition has settled at
    // an extreme: they track the sun once it has fully risen, track each
    // other once it has fully set, and simply hold whatever direction they
    // were already facing while the sun is still rising/setting in between.
    const settledThreshold = 0.02
    if (dayNight.target === 0 && progress <= settledThreshold) {
        faceTowards(sunflower1.group, currentSunPosition, deltaTime)
        faceTowards(sunflower2.group, currentSunPosition, deltaTime)
    } else if (dayNight.target === 1 && progress >= 1 - settledThreshold) {
        const head1WorldPosition = sunflower1.head.getWorldPosition(new THREE.Vector3())
        const head2WorldPosition = sunflower2.head.getWorldPosition(new THREE.Vector3())
        // Face each other, but shyly offset by 30 degrees rather than dead-on
        const nightAngleOffset = THREE.MathUtils.degToRad(30)
        const angleDiff1 = faceTowards(sunflower1.group, head2WorldPosition, deltaTime, nightAngleOffset)
        const angleDiff2 = faceTowards(sunflower2.group, head1WorldPosition, deltaTime, -nightAngleOffset)

        const rotationSettledThreshold = THREE.MathUtils.degToRad(1)
        facingEachOtherSettled = Math.abs(angleDiff1) < rotationSettledThreshold && Math.abs(angleDiff2) < rotationSettledThreshold
    } else {
        facingEachOtherSettled = false
    }

    // Soft glow on the petals and flower centers, but only once the
    // sunflowers have actually finished turning to face each other
    const glowTarget = facingEachOtherSettled ? 0.8 : 0
    glowAmount += (glowTarget - glowAmount) * Math.min(deltaTime * 2, 1)
    petalMaterial.emissiveIntensity = glowAmount
    petalTipMaterial.emissiveIntensity = glowAmount
    centerMaterial.emissiveIntensity = glowAmount

    // Blend lighting and colors between day and night presets
    ambientLight.intensity = THREE.MathUtils.lerp(dayColors.ambientIntensity, nightColors.ambientIntensity, progress)
    sunLight.intensity = THREE.MathUtils.lerp(dayColors.sunIntensity, nightColors.sunIntensity, progress)
    sunLight.color.copy(dayColors.sunLight).lerp(nightColors.sunLight, progress)
    scene.background.copy(dayColors.background).lerp(nightColors.background, progress)
    ground.material.color.copy(dayColors.ground).lerp(nightColors.ground, progress)

    controls.update()

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()