'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/**
 * GSAP 动画演示组件
 * 用于验证 GSAP 集成是否正常工作
 */
export default function GsapDemo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    // 创建动画时间线
    const tl = gsap.timeline({ repeat: -1, yoyo: true })

    // 盒子动画
    tl.to(boxRef.current, {
      x: 100,
      rotation: 360,
      duration: 1,
      ease: 'power2.inOut'
    })

    // 文字动画
    gsap.from(textRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out'
    })

    // 清理函数
    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div className="p-8 bg-dark-900 rounded-xl">
      <p ref={textRef} className="text-dark-50 mb-6 text-center">
        GSAP 动画演示
      </p>
      
      <div className="flex justify-center">
        <div
          ref={boxRef}
          className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg"
        />
      </div>

      <p className="text-dark-500 text-sm text-center mt-6">
        如果看到方块在移动和旋转，说明 GSAP 工作正常 ✓
      </p>
    </div>
  )
}

