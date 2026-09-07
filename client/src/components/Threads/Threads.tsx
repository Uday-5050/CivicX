import { useEffect, useRef } from 'react'
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'
import './Threads.css'

type ThreadsProps = {
  color?: [number, number, number]
  amplitude?: number
  distance?: number
  enableMouseInteraction?: boolean
}

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
#define PI 3.1415926538

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y) * 2.0 - 1.0;
}
float line(vec2 uv, float p) {
  float split = 0.1 + p * 0.4;
  float strength = smoothstep(split, 0.7, uv.x) * 0.5 * uAmplitude * (1.0 + (uMouse.y - 0.5) * 0.2);
  float time = iTime / 10.0 + (uMouse.x - 0.5);
  float wave = noise(vec2(time, uv.x + p) * 2.5) * 0.5 + noise(vec2(time, uv.x + time) * 3.5) * 0.16;
  float y = 0.5 + (p - 0.5) * uDistance + wave * strength;
  float width = (7.0 / max(iResolution.x, iResolution.y)) * (1.0 - p);
  return smoothstep(y + width, y, uv.y) - smoothstep(y, y - width - 0.004, uv.y);
}
void main() {
  float lines = 1.0;
  for (int i = 0; i < 40; i++) {
    float p = float(i) / 40.0;
    lines *= 1.0 - clamp(line(vUv, p) * (1.0 - smoothstep(0.0, 1.0, pow(p, 0.3))), 0.0, 1.0);
  }
  float value = 1.0 - lines;
  gl_FragColor = vec4(uColor * value, value * 0.86);
}
`

export default function Threads({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
}: ThreadsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>(0)
  const propsRef = useRef({ color, amplitude, distance, enableMouseInteraction })
  propsRef.current = { color, amplitude, distance, enableMouseInteraction }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ alpha: true, antialias: true })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    container.appendChild(gl.canvas)

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Color(1, 1, 1) },
        uColor: { value: new Color(...color) },
        uAmplitude: { value: amplitude },
        uDistance: { value: distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const mouse = [0.5, 0.5]
    let targetMouse = [0.5, 0.5]
    let visible = true

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (!width || !height) return
      const baseDpr = Math.min(window.devicePixelRatio || 1, 2)
      const longestSide = Math.max(width, height) * baseDpr
      renderer.dpr = longestSide > 1920 ? (baseDpr * 1920) / longestSide : baseDpr
      renderer.setSize(width, height)
      program.uniforms.iResolution.value.r = gl.canvas.width
      program.uniforms.iResolution.value.g = gl.canvas.height
      program.uniforms.iResolution.value.b = gl.canvas.width / gl.canvas.height
    }
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      targetMouse = [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height]
    }
    const handleMouseLeave = () => { targetMouse = [0.5, 0.5] }
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    resizeObserver.observe(container)
    intersectionObserver.observe(container)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', resize)
    resize()

    const update = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(update)
      if (!visible || document.hidden) return
      const current = propsRef.current
      program.uniforms.uColor.value.set(...current.color)
      program.uniforms.uAmplitude.value = current.amplitude
      program.uniforms.uDistance.value = current.distance
      if (current.enableMouseInteraction) {
        mouse[0] += 0.05 * (targetMouse[0] - mouse[0])
        mouse[1] += 0.05 * (targetMouse[1] - mouse[1])
      } else {
        mouse[0] = 0.5
        mouse[1] = 0.5
      }
      program.uniforms.uMouse.value[0] = mouse[0]
      program.uniforms.uMouse.value[1] = mouse[1]
      program.uniforms.iTime.value = time * 0.001
      renderer.render({ scene: mesh })
    }
    animationFrameRef.current = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener('resize', resize)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <div ref={containerRef} className="threads-container" />
}
