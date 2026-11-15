// Keyframes for the cartoon films. Everything stops for people who ask for less motion.
export const CARTOON_CSS = `
.cf-blink { transform-box: fill-box; transform-origin: center; animation: cf-blink 4.2s infinite }
@keyframes cf-blink { 0%, 94%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
.cf-bob { animation: cf-bob 3.2s ease-in-out infinite }
@keyframes cf-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
.cf-hop { animation: cf-hop 2.2s ease-out both }
@keyframes cf-hop { 0%, 40%, 100% { transform: translateY(0) } 12% { transform: translateY(-26px) } 28% { transform: translateY(-12px) } }
.cf-wheel { transform-box: fill-box; transform-origin: center }
.cf-driving .cf-wheel { animation: cf-spin .9s linear infinite }
@keyframes cf-spin { to { transform: rotate(360deg) } }
.cf-drive { animation: cf-drive 5s cubic-bezier(.2,.6,.3,1) both }
@keyframes cf-drive { from { transform: translateX(-280px) } to { transform: translateX(0) } }
.cf-drive-in { animation: cf-drive-in 4.5s cubic-bezier(.2,.6,.3,1) both }
@keyframes cf-drive-in { from { transform: translateX(380px) } to { transform: translateX(0) } }
.cf-pulse { animation: cf-pulse 1.6s ease-in-out infinite }
@keyframes cf-pulse { 0%, 100% { opacity: .45 } 50% { opacity: 1 } }
.cf-ring { transform-box: fill-box; transform-origin: center; animation: cf-ring 1.6s ease-out infinite }
@keyframes cf-ring { from { transform: scale(.6); opacity: 1 } to { transform: scale(1.8); opacity: 0 } }
.cf-talk { transform-box: fill-box; transform-origin: center; animation: cf-talk .35s ease-in-out infinite alternate }
@keyframes cf-talk { from { transform: scaleY(.45) } to { transform: scaleY(1) } }
.cf-pop { transform-box: fill-box; transform-origin: center; animation: cf-pop .55s cubic-bezier(.3,1.6,.5,1) both }
@keyframes cf-pop { from { transform: scale(0) } to { transform: scale(1) } }
.cf-float { animation: cf-float 3s ease-in-out infinite }
@keyframes cf-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
.cf-fade { animation: cf-fade .7s ease-out both }
@keyframes cf-fade { from { opacity: 0 } to { opacity: 1 } }
.cf-zzz { animation: cf-zzz 3.2s ease-in-out infinite }
@keyframes cf-zzz { 0% { transform: translate(0,0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translate(34px,-80px); opacity: 0 } }
.cf-twinkle { animation: cf-twinkle 2.4s ease-in-out infinite }
@keyframes cf-twinkle { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
.cf-flash { transform-box: fill-box; transform-origin: center; animation: cf-flash 1.8s ease-out infinite }
@keyframes cf-flash { 0%, 100% { opacity: 0; transform: scale(.4) } 8% { opacity: 1; transform: scale(1) } 30% { opacity: 0; transform: scale(1.6) } }
.cf-puff { transform-box: fill-box; transform-origin: center; animation: cf-puff 1.4s ease-out infinite }
@keyframes cf-puff { from { transform: scale(.3); opacity: .9 } to { transform: scale(1.5); opacity: 0 } }
.cf-spark { animation: cf-spark .5s steps(2) infinite }
@keyframes cf-spark { 0% { opacity: 1 } 50% { opacity: .1 } }
.cf-shake { animation: cf-shake .18s linear infinite }
@keyframes cf-shake { 0%, 100% { transform: translateX(0) } 50% { transform: translateX(3px) } }
.cf-ripple { animation: cf-ripple 2.6s ease-out infinite }
@keyframes cf-ripple { from { transform: scale(.15); opacity: 1 } to { transform: scale(1.7); opacity: 0 } }
.cf-haze { animation: cf-haze 8s ease-in both }
@keyframes cf-haze { from { opacity: 0 } to { opacity: .72 } }
.cf-dim { animation: cf-dim 7s ease-in both }
@keyframes cf-dim { from { opacity: 1 } to { opacity: .12 } }
.cf-out-late { animation: cf-out-late 8s linear both }
@keyframes cf-out-late { 0%, 70% { opacity: 1 } 80%, 100% { opacity: 0 } }
.cf-in-late { animation: cf-in-late 8s linear both }
@keyframes cf-in-late { 0%, 70% { opacity: 0 } 80%, 100% { opacity: 1 } }
.cf-flood { animation: cf-flood 10s ease-in-out both }
@keyframes cf-flood { 0% { opacity: 0 } 25%, 55% { opacity: .85 } 100% { opacity: .08 } }
.cf-hops { animation: cf-hops 6s cubic-bezier(.4,0,.6,1) both }
@keyframes cf-hops { 0% { transform: translateY(-320px) } 30% { transform: translateY(0) } 40% { transform: translateY(-80px) } 50% { transform: translateY(0) } 58% { transform: translateY(-30px) } 66%, 100% { transform: translateY(0) } }
.cf-hops-flame { animation: cf-hops-flame 6s linear both }
@keyframes cf-hops-flame { 0%, 64% { opacity: 1 } 67%, 100% { opacity: 0 } }
.cf-descend { animation: cf-descend 4.5s cubic-bezier(.2,.7,.4,1) both }
@keyframes cf-descend { from { transform: translateY(-330px) } to { transform: translateY(0) } }
.cf-plume-out { animation: cf-plume-out 4.6s linear both }
@keyframes cf-plume-out { 0%, 92% { opacity: 1 } 100% { opacity: 0 } }
.cf-flicker { transform-box: fill-box; transform-origin: top; animation: cf-flicker .12s linear infinite alternate }
@keyframes cf-flicker { from { transform: scaleY(.8) } to { transform: scaleY(1.15) } }
.cf-liftoff { animation: cf-liftoff 5.5s cubic-bezier(.5,0,.8,.6) both }
@keyframes cf-liftoff { 0%, 22% { transform: translateY(0) } 100% { transform: translateY(-480px) } }
.cf-liftflame { animation: cf-liftflame 5.5s linear both }
@keyframes cf-liftflame { 0%, 18% { opacity: 0 } 22%, 100% { opacity: 1 } }
.cf-crash { animation: cf-crash 2.6s cubic-bezier(.5,0,1,1) both }
@keyframes cf-crash { 0% { transform: translate(-200px,-330px) rotate(-25deg); opacity: 1 } 96% { transform: translate(0,0) rotate(-25deg); opacity: 1 } 100% { transform: translate(0,0); opacity: 0 } }
.cf-burst { transform-box: fill-box; transform-origin: center; animation: cf-burst 1.6s ease-out 2.5s both }
@keyframes cf-burst { from { transform: scale(0); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
.cf-walkin { animation: cf-walkin 4s ease-out both }
@keyframes cf-walkin { from { transform: translateX(320px) } to { transform: translateX(0) } }
.cf-step { animation: cf-step .45s ease-in-out infinite alternate }
@keyframes cf-step { from { transform: translateY(0) } to { transform: translateY(-3px) } }
.cf-rollin { animation: cf-rollin 1.8s cubic-bezier(.2,.7,.3,1) both }
@keyframes cf-rollin { from { transform: translateX(-260px) } to { transform: translateX(0) } }
.cf-roll { transform-box: fill-box; transform-origin: center; animation: cf-roll 4.2s cubic-bezier(.15,.6,.3,1) both }
@keyframes cf-roll { from { transform: translateX(-360px) rotate(-900deg) } to { transform: translateX(0) rotate(0) } }
.cf-deflate { transform-box: fill-box; transform-origin: center bottom; animation: cf-deflate 1.6s ease-in 4.4s both }
@keyframes cf-deflate { from { transform: scale(1); opacity: 1 } to { transform: scale(.25); opacity: 0 } }
.cf-reveal { animation: cf-fade .8s ease-out both }
.cf-unfold { animation: cf-unfold 2.6s cubic-bezier(.4,0,.3,1) .6s both }
@keyframes cf-unfold { 0% { transform: rotate(-88deg); opacity: 1 } 80% { opacity: 1 } 100% { transform: rotate(0); opacity: 0 } }
.cf-sweep { animation: cf-sweep 3.4s ease-in-out infinite alternate }
@keyframes cf-sweep { from { transform: translateX(-30px) } to { transform: translateX(30px) } }
.cf-rise { animation: cf-rise 1.8s ease-out infinite }
@keyframes cf-rise { from { transform: translateY(0); opacity: .9 } to { transform: translateY(-34px); opacity: 0 } }
.cf-bounce-off { animation: cf-bounce-off 2.2s ease-in-out infinite }
@keyframes cf-bounce-off { 0%, 100% { transform: translateX(-26px) } 50% { transform: translateX(0) } }
.cf-sink { animation: cf-sink 3.5s ease-in both }
@keyframes cf-sink { from { transform: translateY(-14px) } to { transform: translateY(16px) } }
.cf-airbag { animation: cf-airbag 6s cubic-bezier(.3,.6,.4,1) both }
@keyframes cf-airbag {
  0% { transform: translateY(-330px) } 18% { transform: translateY(0) } 30% { transform: translateY(-190px) } 42% { transform: translateY(0) }
  52% { transform: translateY(-100px) } 61% { transform: translateY(0) } 68% { transform: translateY(-45px) } 74% { transform: translateY(0) }
  78% { transform: translateY(-16px) } 82%, 100% { transform: translateY(0) }
}
.cf-trace { stroke-dasharray: 1; stroke-dashoffset: 1; animation: cf-trace 5s ease-out .4s forwards }
@keyframes cf-trace { to { stroke-dashoffset: 0 } }
.cf-scan { animation: cf-scan 7s linear both }
@keyframes cf-scan { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
.cf-flow { animation: cf-flow .8s linear infinite }
@keyframes cf-flow { to { stroke-dashoffset: -24 } }
.cf-drive.cf-driving .cf-wheel, .cf-drive-in.cf-driving .cf-wheel { animation-iteration-count: 6 }
@media (prefers-reduced-motion: reduce) {
  [class*='cf-'] { animation: none !important }
  .cf-haze { opacity: .72 } .cf-dim { opacity: .12 } .cf-out-late, .cf-unfold, .cf-deflate, .cf-crash { opacity: 0 }
  .cf-zzz, .cf-ripple, .cf-puff, .cf-flash, .cf-burst { opacity: 0 }
  .cf-trace { stroke-dashoffset: 0 }
  .cf-liftoff { transform: translateY(-480px) }
}
`
