/* 車車出動 — 互動邏輯
   聲音全部用 Web Audio API 即時合成，沒有任何外部音檔，離線也能玩。 */
(function(){
  "use strict";

  /* ============ 聲音 ============ */
  var ac = null, muted = false;

  function AC(){
    if(!ac){
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if(!Ctor) return null;
      ac = new Ctor();
    }
    if(ac.state === "suspended"){ ac.resume(); }
    return ac;
  }

  function tone(opts){
    var c = AC(); if(!c || muted) return;
    var t0 = c.currentTime + (opts.at || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = opts.type || "sine";
    o.frequency.setValueAtTime(opts.f, t0);
    if(opts.to){ o.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur); }
    var peak = opts.gain || 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    var node = o;
    if(opts.lp){
      var f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = opts.lp;
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + opts.dur + 0.05);
  }

  function noiseBurst(opts){
    var c = AC(); if(!c || muted) return;
    var t0 = c.currentTime + (opts.at || 0);
    var len = Math.floor(c.sampleRate * opts.dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for(var i=0;i<len;i++){ d[i] = Math.random()*2-1; }
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = "bandpass"; f.Q.value = opts.q || 1.4;
    f.frequency.setValueAtTime(opts.f, t0);
    f.frequency.exponentialRampToValueAtTime(opts.to || opts.f, t0 + opts.dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain || 0.22, t0 + opts.dur*0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t0); src.stop(t0 + opts.dur + 0.05);
  }

  function say(text){
    if(muted || !window.speechSynthesis) return;
    try{
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-TW"; u.rate = 0.8; u.pitch = 1.12;
      window.speechSynthesis.speak(u);
    }catch(e){ /* 沒有中文語音就跳過 */ }
  }

  /* 給愛麗絲 —— 台灣垃圾車的招牌旋律 */
  var FUR = [
    [659.25,1],[622.25,1],[659.25,1],[622.25,1],[659.25,1],[493.88,1],[587.33,1],[523.25,1],
    [440.00,3],[0,1],[261.63,1],[329.63,1],[440.00,1],[493.88,3],[0,1],
    [329.63,1],[415.30,1],[493.88,1],[523.25,3]
  ];
  function furElise(){
    var unit = 0.17, at = 0;
    for(var i=0;i<FUR.length;i++){
      var f = FUR[i][0], beats = FUR[i][1];
      if(f > 0){
        tone({f:f, at:at, dur:unit*beats*0.95, type:"triangle", gain:0.17});
        tone({f:f*2, at:at, dur:unit*beats*0.5, type:"sine", gain:0.05});
      }
      at += unit*beats;
    }
  }

  function siren(){
    for(var i=0;i<3;i++){
      tone({f:620, to:1240, at:i*0.62, dur:0.31, type:"sawtooth", gain:0.13, lp:2600});
      tone({f:1240, to:620, at:i*0.62+0.31, dur:0.31, type:"sawtooth", gain:0.13, lp:2600});
    }
  }

  function engineRumble(){
    var c = AC(); if(!c || muted) return;
    var t0 = c.currentTime, dur = 2.4;
    var o = c.createOscillator(), o2 = c.createOscillator();
    var f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o2.type = "square";
    o.frequency.setValueAtTime(56, t0);
    o.frequency.linearRampToValueAtTime(94, t0 + dur*0.45);
    o.frequency.linearRampToValueAtTime(62, t0 + dur);
    o2.frequency.setValueAtTime(29, t0);
    o2.frequency.linearRampToValueAtTime(47, t0 + dur*0.45);
    f.type = "lowpass"; f.frequency.value = 380;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.12);
    g.gain.setValueAtTime(0.28, t0 + dur*0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(c.destination);
    o.start(t0); o2.start(t0); o.stop(t0+dur+0.05); o2.stop(t0+dur+0.05);
  }

  function truckHorn(){
    tone({f:196, dur:0.62, type:"sawtooth", gain:0.16, lp:1500});
    tone({f:247, dur:0.62, type:"sawtooth", gain:0.13, lp:1500});
    tone({f:98,  dur:0.66, type:"square",  gain:0.10, lp:800});
  }

  function whoosh(){
    noiseBurst({f:340, to:2600, dur:0.75, gain:0.2, q:1.1});
    noiseBurst({f:2600, to:300, dur:0.9, at:0.6, gain:0.16, q:1.1});
    tone({f:880, at:0.05, dur:0.5, type:"sine", gain:0.05});
  }

  function dingDing(){
    [0, 0.34].forEach(function(at){
      tone({f:1318.5, at:at, dur:0.55, type:"sine", gain:0.2});
      tone({f:2637,  at:at, dur:0.34, type:"sine", gain:0.07});
      tone({f:3956,  at:at, dur:0.2,  type:"sine", gain:0.035});
    });
  }

  function waterSpray(){
    noiseBurst({f:1800, to:900, dur:1.6, gain:0.13, q:0.8});
  }

  // 東西掉進車斗的悶響，每一件到位時各響一次
  function thud(at){
    tone({f:150, to:70, at:at, dur:0.22, type:"triangle", gain:0.2, lp:600});
    noiseBurst({f:400, to:150, dur:0.2, at:at, gain:0.1, q:0.7});
  }

  // 砂石倒進滾筒的沙沙聲
  function gravel(at){
    noiseBurst({f:2600, to:900, dur:0.5, at:at, gain:0.11, q:0.5});
  }

  // 每件貨物飛出去時的時間點，跟畫面上的動畫對齊
  var LAND = [1.2, 1.65, 2.1];

  /* ============ 車子圖形 ============ */
  function wheel(cx, cy, r){
    return '<g class="wheel">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2B3138"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r*0.5) + '" fill="#D6DEE4"/>' +
      '<rect x="' + (cx-r*0.07) + '" y="' + (cy-r*0.46) + '" width="' + (r*0.14) + '" height="' + (r*0.92) + '" fill="#8C98A3"/>' +
      '<rect x="' + (cx-r*0.07) + '" y="' + (cy-r*0.46) + '" width="' + (r*0.14) + '" height="' + (r*0.92) + '" fill="#8C98A3" transform="rotate(90 ' + cx + ' ' + cy + ')"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r*0.16) + '" fill="#5D6874"/>' +
      '</g>';
  }

  function railWheel(cx, cy, r){
    return '<g class="wheel">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2B3138"/>' +
      '<rect x="' + (cx-2) + '" y="' + (cy-r-2) + '" width="4" height="' + (r*2+4) + '" fill="#8C98A3"/>' +
      '<rect x="' + (cx-2) + '" y="' + (cy-r-2) + '" width="4" height="' + (r*2+4) + '" fill="#8C98A3" transform="rotate(90 ' + cx + ' ' + cy + ')"/>' +
      '</g>';
  }

  // 東西要飛進車裡的目標點。畫成透明方塊，只是拿來量位置用的。
  function loadPort(x, y, w, h){
    return '<rect class="load-port" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" pointer-events="none"/>';
  }

  // 車窗裡的乘客：有頭髮、臉和眼睛，才看得出是人而不是色點
  function paxHead(x, y, r, tint, n){
    var eye = Math.max(1, r * 0.22);
    return '<g class="pax pax' + n + '">' +
      '<rect x="' + (x - r*1.05) + '" y="' + (y + r*0.5) + '" width="' + (r*2.1) + '" height="' + (r*1.6) + '" rx="' + (r*0.75) + '" fill="' + tint + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#F7D8B6"/>' +
      '<path d="M' + (x-r) + ' ' + (y-r*0.22) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x+r) + ' ' + (y-r*0.22) + ' Z" fill="#3A2E28"/>' +
      '<circle cx="' + (x - r*0.36) + '" cy="' + (y + r*0.14) + '" r="' + eye + '" fill="#2B3138"/>' +
      '<circle cx="' + (x + r*0.36) + '" cy="' + (y + r*0.14) + '" r="' + eye + '" fill="#2B3138"/>' +
      '</g>';
  }

  /* ============ 工作現場的道具 ============ */
  /* 會飛進車子的東西一律做成獨立的 HTML div：CSS 的 translate 用的是 px，
     放在 SVG 裡面會被 viewBox 縮放，落點就不準了。 */
  function prop(cls, left, bottom, width, svg){
    return '<div class="prop ' + cls + '" style="left:' + left + '%;bottom:' + bottom + '%;width:' + width + '%">' + svg + '</div>';
  }

  var BAG =
    '<svg viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M5 44 Q1 22 12 14 L28 14 Q39 22 35 44 Z" fill="#3F7A3F"/>' +
    '<path d="M12 14 L15 4 L25 4 L28 14 Z" fill="#2E5E2E"/>' +
    '<path d="M12 22 Q20 28 28 22" stroke="#5A9A5A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  var BOX =
    '<svg viewBox="0 0 44 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="2" y="8" width="40" height="28" rx="3" fill="#C89A5B"/>' +
    '<rect x="2" y="8" width="40" height="7" rx="3" fill="#B0854A"/>' +
    '<rect x="19" y="8" width="6" height="28" fill="#A87B41"/>' +
    '</svg>';

  function rock(tint){
    return '<svg viewBox="0 0 34 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M3 26 Q1 12 12 6 Q24 1 31 12 Q34 24 24 28 Z" fill="' + tint + '"/>' +
      '<path d="M10 20 Q14 14 22 16" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  // 在旁邊工作的人。手臂會往上甩，看起來就是把東西丟上車。
  function worker(vest){
    return '<svg viewBox="0 0 30 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="7" y="26" width="18" height="27" rx="6" fill="' + vest + '"/>' +
      '<rect x="7" y="34" width="18" height="4" fill="rgba(255,255,255,.72)"/>' +
      '<circle cx="15" cy="16" r="8" fill="#F7D8B6"/>' +
      '<path d="M5 13 Q5 3 15 3 Q25 3 25 13 Z" fill="#F2C21E"/>' +
      '<rect x="3" y="12" width="24" height="3.4" rx="1.7" fill="#E0AF10"/>' +
      '<circle cx="12" cy="17" r="1.5" fill="#2B3138"/>' +
      '<circle cx="18" cy="17" r="1.5" fill="#2B3138"/>' +
      '<path d="M12 21 Q15 24 18 21" stroke="#2B3138" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<g class="arm"><rect x="22" y="27" width="6" height="19" rx="3" fill="' + vest + '"/></g>' +
      '</svg>';
  }

  function personSvg(tint){
    return '<svg viewBox="0 0 24 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="0.5" y="24" width="4.5" height="15" rx="2.25" fill="' + tint + '"/>' +
      '<rect x="19" y="24" width="4.5" height="15" rx="2.25" fill="' + tint + '"/>' +
      '<rect x="4" y="22" width="16" height="28" rx="6" fill="' + tint + '"/>' +
      '<circle cx="12" cy="12" r="8" fill="#F7D8B6"/>' +
      '<path d="M4 10 A 8 8 0 0 1 20 10 Z" fill="#3A2E28"/>' +
      '<circle cx="9" cy="13" r="1.5" fill="#2B3138"/>' +
      '<circle cx="15" cy="13" r="1.5" fill="#2B3138"/>' +
      '<path d="M9.5 17 Q12 19.6 14.5 17" stroke="#2B3138" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  var DECK =
    '<svg viewBox="0 0 120 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="0" y="2" width="120" height="16" rx="3" fill="#C4CDD4"/>' +
    '<rect x="0" y="2" width="120" height="5" rx="2" fill="#DCE3E8"/>' +
    '</svg>';

  var VEHICLES = [
    {
      /* 台灣的垃圾車是後方裝載，大家拿著袋子在車尾等，自己丟進去。
         所以現場擺在車子左邊（翻面之後那是車尾）。 */
      id:"garbage", name:"垃圾車", tint:"#E3B90A", track:"road",
      sound:furElise,
      job:"大家把垃圾拿出來，一袋一袋丟進垃圾車裡",
      stop:44,
      jobSound:function(){ furElise(); LAND.forEach(thud); },
      fly:[{sel:".bag", target:".load-port"}],
      props:
        prop("bag b1", 25, 30, 5.8, BAG) +
        prop("bag b2", 30.5, 30, 5.8, BAG) +
        prop("bag b3", 36, 30, 5.8, BAG) +
        prop("worker", 42, 30, 5.2, worker("#F5A524")),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="垃圾車">' +
        '<g class="body">' +
        '<rect x="82" y="52" width="212" height="72" rx="8" fill="#EFC81C"/>' +
        '<rect x="82" y="52" width="212" height="16" rx="6" fill="#D3AE10"/>' +
        // 車斗裡越堆越高的垃圾
        '<g class="fill-load"><rect x="90" y="64" width="196" height="56" rx="4" fill="#4E7D34"/>' +
        '<circle cx="130" cy="68" r="10" fill="#5C8F3E"/><circle cx="190" cy="64" r="12" fill="#5C8F3E"/>' +
        '<circle cx="248" cy="69" r="9" fill="#5C8F3E"/></g>' +
        '<rect x="252" y="38" width="66" height="86" rx="8" fill="#D3AE10"/>' +
        '<rect x="258" y="46" width="54" height="30" rx="5" fill="#8F7508"/>' +
        '<rect x="306" y="86" width="26" height="10" rx="4" fill="#7E8791"/>' +
        '<path d="M18 124 L18 70 Q18 58 30 56 L62 52 L84 52 L84 124 Z" fill="#F5D430"/>' +
        '<path d="M30 66 L74 62 L74 92 L28 92 Z" fill="#BFE3F2"/>' +
        '<path d="M30 66 L52 64 L36 92 L28 92 Z" fill="#DCF0F8"/>' +
        '<rect x="16" y="104" width="14" height="18" rx="4" fill="#5D6874"/>' +
        '<rect x="94" y="78" width="148" height="8" rx="4" fill="#FFFFFF" opacity=".85"/>' +
        loadPort(258, 42, 56, 22) +
        '<g class="notes"><text x="200" y="34" font-size="34" fill="#2E7D32">&#9834;</text></g>' +
        '<g class="notes n2"><text x="238" y="38" font-size="26" fill="#43A047">&#9835;</text></g>' +
        '<g class="notes n3"><text x="170" y="36" font-size="22" fill="#2E7D32">&#9834;</text></g>' +
        '</g>' +
        wheel(120,132,26) + wheel(226,132,26) + wheel(288,132,26) +
        '</svg>'
    },
    {
      /* 水泥車也是從車尾的進料口裝砂石，裝滿之後滾筒一邊轉一邊載走。 */
      id:"mixer", name:"水泥車", tint:"#EE7B2E", track:"road",
      sound:engineRumble,
      job:"砂石裝進滾筒裡，水泥車一邊轉一邊載去蓋房子",
      stop:44,
      jobSound:function(){ engineRumble(); LAND.forEach(gravel); },
      fly:[{sel:".rock", target:".load-port"}],
      props:
        prop("pile", 15, 28, 22,
          '<svg viewBox="0 0 140 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path class="pile-body" d="M4 52 Q34 10 70 20 Q104 8 136 52 Z" fill="#A8916F"/>' +
          '<path class="pile-body" d="M20 52 Q44 28 70 34 Q98 26 120 52 Z" fill="#8E7856"/>' +
          '</svg>') +
        prop("rock r1", 20, 40, 4.6, rock("#B9A484")) +
        prop("rock r2", 26, 43, 5.0, rock("#A8916F")) +
        prop("rock r3", 32, 40, 4.4, rock("#C0AB8A")),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="水泥車">' +
        '<g class="body">' +
        '<rect x="76" y="106" width="248" height="20" rx="5" fill="#535E6A"/>' +
        '<defs><clipPath id="mx-drum"><ellipse cx="216" cy="74" rx="94" ry="46"/></clipPath></defs>' +
        '<ellipse cx="216" cy="74" rx="94" ry="46" fill="#EE7B2E"/>' +
        '<g class="drum" clip-path="url(#mx-drum)">' +
          '<rect x="120" y="10" width="18" height="140" fill="#FFF3E6" transform="rotate(16 216 74)"/>' +
          '<rect x="176" y="10" width="18" height="140" fill="#FFF3E6" transform="rotate(16 216 74)"/>' +
          '<rect x="232" y="10" width="18" height="140" fill="#FFF3E6" transform="rotate(16 216 74)"/>' +
          '<rect x="288" y="10" width="18" height="140" fill="#FFF3E6" transform="rotate(16 216 74)"/>' +
        '</g>' +
        // 裝滿之後滾筒下半部看得到砂石
        '<g class="fill-load" clip-path="url(#mx-drum)">' +
        '<path d="M122 78 Q170 60 216 76 Q262 92 310 76 L310 122 L122 122 Z" fill="#8A7F70"/>' +
        '<circle cx="160" cy="82" r="7" fill="#9C9082"/><circle cx="232" cy="86" r="8" fill="#9C9082"/>' +
        '<circle cx="284" cy="82" r="6" fill="#9C9082"/></g>' +
        '<ellipse cx="216" cy="74" rx="94" ry="46" fill="none" stroke="#C85E17" stroke-width="5"/>' +
        '<path d="M300 44 L352 66 L348 92 L296 76 Z" fill="#B8B0A4"/>' +
        '<path d="M306 50 L344 66 L342 84 L302 70 Z" fill="#9A9184"/>' +
        '<path d="M14 126 L14 70 Q14 58 26 56 L58 50 L80 50 L80 126 Z" fill="#E85D2A"/>' +
        '<path d="M26 66 L70 60 L70 90 L24 90 Z" fill="#BFE3F2"/>' +
        '<path d="M26 66 L48 62 L32 90 L24 90 Z" fill="#DCF0F8"/>' +
        '<rect x="12" y="106" width="14" height="18" rx="4" fill="#5D6874"/>' +
        loadPort(302, 46, 48, 26) +
        '</g>' +
        wheel(114,134,26) + wheel(228,134,26) + wheel(290,134,26) +
        '</svg>'
    },
    {
      id:"fire", name:"消防車", tint:"#E03131", track:"road",
      sound:siren,
      job:"房子失火了，消防車噴水把火滅掉",
      stop:18,
      jobSound:function(){ siren(); waterSpray(); },
      fly:[],
      props:
        prop("house", 68, 100, 23,
          // viewBox 上方留白，火舌和濃煙才竄得出屋頂
          '<svg viewBox="0 -70 120 186" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          // 燒起來就一直冒的黑煙
          '<g class="burn-smoke">' +
          '<circle class="bpuff k1" cx="50" cy="-4" r="12" fill="#8D979D"/>' +
          '<circle class="bpuff k2" cx="70" cy="-8" r="10" fill="#A3ACB1"/>' +
          '<circle class="bpuff k3" cx="59" cy="-14" r="9" fill="#B7BFC3"/>' +
          '</g>' +
          // 澆熄的瞬間冒出的白色水蒸氣
          '<g class="steam">' +
          '<circle class="spuff m1" cx="46" cy="18" r="15" fill="#E4EAED"/>' +
          '<circle class="spuff m2" cx="70" cy="14" r="13" fill="#EEF3F5"/>' +
          '<circle class="spuff m3" cx="58" cy="6" r="16" fill="#F5F8F9"/>' +
          '<circle class="spuff m4" cx="84" cy="20" r="11" fill="#E4EAED"/>' +
          '</g>' +
          // 屋頂上的大火，四束火舌各自搖晃
          '<g class="flames">' +
          '<path class="flame f1" d="M32 46 Q18 20 36 -18 Q44 10 58 -10 Q74 20 56 48 Z" fill="#E04A22"/>' +
          '<path class="flame f2" d="M58 46 Q46 18 66 -26 Q72 8 88 -12 Q100 22 82 48 Z" fill="#F5822B"/>' +
          '<path class="flame f3" d="M42 48 Q34 26 50 2 Q55 24 68 8 Q78 30 64 50 Z" fill="#F2B01E"/>' +
          '<path class="flame f4" d="M58 50 Q52 34 64 16 Q67 32 76 22 Q83 40 72 52 Z" fill="#F7D64A"/>' +
          '</g>' +
          '<path d="M8 54 L60 22 L112 54 Z" fill="#C0603F"/>' +
          '<rect x="20" y="52" width="80" height="58" fill="#F0E4D2"/>' +
          '<rect x="20" y="52" width="80" height="5" fill="#DCCDB6"/>' +
          '<rect x="50" y="80" width="20" height="30" rx="2" fill="#8A6A4F"/>' +
          // 失火時窗戶透出橘光，滅火後恢復成藍色玻璃
          '<rect class="glow" x="28" y="64" width="16" height="14" rx="2" fill="#F2B01E"/>' +
          '<rect class="glow" x="76" y="64" width="16" height="14" rx="2" fill="#F2B01E"/>' +
          '<rect class="cool" x="28" y="64" width="16" height="14" rx="2" fill="#BFE3F2"/>' +
          '<rect class="cool" x="76" y="64" width="16" height="14" rx="2" fill="#BFE3F2"/>' +
          '</svg>'),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="消防車">' +
        '<g class="body">' +
        '<rect x="78" y="58" width="256" height="68" rx="8" fill="#DC2B2B"/>' +
        '<rect x="78" y="86" width="256" height="12" fill="#FFFFFF"/>' +
        '<rect x="96" y="102" width="52" height="20" rx="4" fill="#F0D9A8"/>' +
        '<rect x="160" y="102" width="52" height="20" rx="4" fill="#F0D9A8"/>' +
        '<rect x="224" y="102" width="52" height="20" rx="4" fill="#F0D9A8"/>' +
        '<rect x="92" y="44" width="238" height="10" rx="5" fill="#C2CAD2"/>' +
        '<rect x="92" y="30" width="238" height="10" rx="5" fill="#C2CAD2"/>' +
        '<rect x="120" y="30" width="8" height="24" fill="#AAB3BB"/>' +
        '<rect x="180" y="30" width="8" height="24" fill="#AAB3BB"/>' +
        '<rect x="240" y="30" width="8" height="24" fill="#AAB3BB"/>' +
        '<rect x="298" y="30" width="8" height="24" fill="#AAB3BB"/>' +
        '<path d="M14 126 L14 74 Q14 62 26 60 L58 56 L80 56 L80 126 Z" fill="#E53935"/>' +
        '<path d="M26 70 L70 66 L70 94 L24 94 Z" fill="#BFE3F2"/>' +
        '<path d="M26 70 L48 68 L32 94 L24 94 Z" fill="#DCF0F8"/>' +
        '<rect x="24" y="44" width="20" height="12" rx="5" fill="#1E88E5" class="beacon"/>' +
        '<rect x="50" y="44" width="20" height="12" rx="5" fill="#E53935" class="beacon b2"/>' +
        '<rect x="10" y="108" width="14" height="16" rx="4" fill="#5D6874"/>' +
        '<circle cx="150" cy="22" r="9" fill="#9EA7AF"/>' +
        '<g class="spray"><circle cx="158" cy="20" r="9" fill="#7EC8F0" opacity=".9"/></g>' +
        '<g class="spray s2"><circle cx="158" cy="24" r="6" fill="#A8DCF0" opacity=".9"/></g>' +
        '<g class="spray s3"><circle cx="158" cy="17" r="7" fill="#5FB8E6" opacity=".9"/></g>' +
        '<g class="spray s4"><circle cx="158" cy="21" r="8" fill="#8FD2F2" opacity=".9"/></g>' +
        '<g class="spray s5"><circle cx="158" cy="18" r="5" fill="#B8E6F8" opacity=".9"/></g>' +
        '<g class="spray s6"><circle cx="158" cy="23" r="7" fill="#7EC8F0" opacity=".9"/></g>' +
        '</g>' +
        wheel(116,134,26) + wheel(250,134,26) + wheel(312,134,26) +
        '</svg>'
    },
    {
      /* 貨物本來藏在車廂後面（被車身擋住），工作時才一箱一箱搬出來送進店門。 */
      id:"truck", name:"卡車", tint:"#2F7FD1", track:"road",
      sound:truckHorn,
      job:"卡車把車上的貨物一箱一箱搬進店裡",
      stop:16,
      jobSound:function(){ truckHorn(); LAND.forEach(thud); },
      fly:[{sel:".box", target:".door-port"}],
      props:
        prop("shop", 74, 100, 22,
          '<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="12" y="34" width="96" height="66" fill="#EDE2D4"/>' +
          '<rect x="4" y="24" width="112" height="14" rx="4" fill="#2F7FD1"/>' +
          '<rect x="4" y="24" width="112" height="5" rx="2" fill="#5AA0DD"/>' +
          '<rect x="48" y="58" width="24" height="42" rx="2" fill="#8A6A4F"/>' +
          '<circle cx="67" cy="80" r="2.5" fill="#E8DCC8"/>' +
          '<rect x="20" y="48" width="22" height="20" rx="2" fill="#BFE3F2"/>' +
          '<rect x="78" y="48" width="22" height="20" rx="2" fill="#BFE3F2"/>' +
          // 送到之後櫥窗裡才有貨
          '<g class="stock">' +
          '<rect x="23" y="56" width="7" height="10" rx="1" fill="#C89A5B"/>' +
          '<rect x="32" y="53" width="7" height="13" rx="1" fill="#B0854A"/>' +
          '<rect x="81" y="55" width="7" height="11" rx="1" fill="#C89A5B"/>' +
          '<rect x="90" y="52" width="7" height="14" rx="1" fill="#B0854A"/>' +
          '</g>' +
          '</svg>') +
        // 店門口：貨物飛過去的落點，本身看不見
        '<div class="prop door-port" style="left:84%;bottom:100%;width:3%;height:14%"></div>' +
        prop("worker", 64, 30, 3.6, worker("#2F7FD1")) +
        prop("box x1", 30, 30, 5.5, BOX) +
        prop("box x2", 35, 30, 5.5, BOX) +
        prop("box x3", 40, 30, 5.5, BOX),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="卡車">' +
        '<g class="body">' +
        '<rect x="112" y="40" width="226" height="86" rx="6" fill="#EDF2F6"/>' +
        '<rect x="112" y="40" width="226" height="86" rx="6" fill="none" stroke="#B9C6D1" stroke-width="4"/>' +
        '<rect x="128" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="168" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="208" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="248" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="288" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="322" y="40" width="7" height="86" fill="#D3DDE5"/>' +
        '<rect x="140" y="66" width="170" height="26" rx="4" fill="#2F7FD1"/>' +
        '<path d="M16 126 L16 58 Q16 44 30 42 L74 38 L106 38 L106 126 Z" fill="#2F7FD1"/>' +
        '<path d="M32 56 L96 50 L96 86 L30 86 Z" fill="#BFE3F2"/>' +
        '<path d="M32 56 L60 53 L40 86 L30 86 Z" fill="#DCF0F8"/>' +
        '<rect x="14" y="104" width="16" height="20" rx="4" fill="#5D6874"/>' +
        '<rect x="98" y="96" width="20" height="30" rx="4" fill="#255F9E"/>' +
        '</g>' +
        wheel(64,134,26) + wheel(176,134,26) + wheel(244,134,26) + wheel(310,134,26) +
        '</svg>'
    },
    {
      id:"thsr", name:"高鐵", tint:"#F26A21", track:"viaduct",
      sound:whoosh,
      job:"乘客走進車廂坐好，高鐵載大家去很遠的地方",
      stop:14,
      jobSound:function(){ dingDing(); whoosh(); },
      fly:[{sel:".pax-in", target:".load-port"}],
      props:
        prop("deck", 76, 46, 20, DECK) +
        prop("pax-in w1", 79, 52, 2.6, personSvg("#E0653F")) +
        prop("pax-in w2", 84, 52, 2.6, personSvg("#2F7FD1")) +
        prop("pax-in w3", 89, 52, 2.6, personSvg("#7A4FA8")),
      svg: '<svg viewBox="0 0 520 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="高鐵">' +
        '<g class="body">' +
        '<path d="M14 104 Q60 40 168 34 L470 34 Q498 34 498 58 L498 104 Z" fill="#FAFCFD"/>' +
        '<path d="M14 104 Q60 40 168 34 L470 34 Q498 34 498 58 L498 104 Z" fill="none" stroke="#D5DEE4" stroke-width="3"/>' +
        '<rect x="150" y="52" width="336" height="22" rx="6" fill="#28323B"/>' +
        '<path d="M42 88 Q72 56 128 50 L142 50 L142 74 L36 74 Z" fill="#28323B"/>' +
        '<rect x="16" y="82" width="482" height="9" fill="#F26A21"/>' +
        '<rect x="170" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        '<rect x="216" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        '<rect x="262" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        '<rect x="308" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        '<rect x="354" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        '<rect x="400" y="58" width="30" height="12" rx="3" fill="#4B5A66"/>' +
        paxHead(185, 65, 7, "#E0653F", 1) + paxHead(231, 65, 7, "#2F7FD1", 2) +
        paxHead(277, 65, 7, "#7A4FA8", 3) + paxHead(323, 65, 7, "#3C8C3C", 4) +
        paxHead(369, 65, 7, "#E0653F", 5) + paxHead(415, 65, 7, "#2F7FD1", 6) +
        '<rect x="330" y="14" width="70" height="8" rx="4" fill="#7C8892"/>' +
        '<path d="M352 34 L340 16 M378 34 L392 16" stroke="#7C8892" stroke-width="5" fill="none"/>' +
        '<rect x="16" y="104" width="482" height="10" rx="3" fill="#5D6874"/>' +
        loadPort(152, 52, 56, 24) +
        '</g>' +
        railWheel(120,122,12) + railWheel(260,122,12) + railWheel(410,122,12) +
        '</svg>'
    },
    {
      id:"lrt", name:"輕軌", tint:"#00A167", track:"grass",
      sound:dingDing,
      job:"輕軌到站開門，大家走進車廂坐好囉",
      stop:22,
      jobSound:function(){ dingDing(); },
      fly:[{sel:".pax-in", target:".load-port"}],
      props:
        prop("deck", 72, 30, 20, DECK) +
        prop("pax-in w1", 75, 36, 2.8, personSvg("#E0653F")) +
        prop("pax-in w2", 80, 36, 2.8, personSvg("#2F7FD1")) +
        prop("pax-in w3", 85, 36, 2.8, personSvg("#7A4FA8")),
      svg: '<svg viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="輕軌">' +
        '<g class="body">' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="#FBFDFD"/>' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="none" stroke="#D5DEE4" stroke-width="3"/>' +
        '<path d="M12 96 Q12 44 56 42 L120 42 L120 78 L12 78 Z" fill="#28323B"/>' +
        '<rect class="door" x="132" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect class="door" x="204" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect class="door" x="276" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect x="348" y="48" width="66" height="30" rx="5" fill="#28323B"/>' +
        paxHead(150, 63, 8, "#E0653F", 1) + paxHead(174, 63, 8, "#2F7FD1", 2) +
        paxHead(222, 63, 8, "#7A4FA8", 3) + paxHead(246, 63, 8, "#3C8C3C", 4) +
        paxHead(294, 63, 8, "#E0653F", 5) + paxHead(318, 63, 8, "#2F7FD1", 6) +
        '<rect x="12" y="88" width="414" height="12" fill="#00A167"/>' +
        '<rect x="12" y="100" width="414" height="5" fill="#7FD0AE"/>' +
        '<rect x="196" y="34" width="8" height="78" fill="#E7EDF1"/>' +
        '<rect x="268" y="34" width="8" height="78" fill="#E7EDF1"/>' +
        '<circle cx="34" cy="68" r="7" fill="#FFE082"/>' +
        '<rect x="12" y="112" width="414" height="10" rx="3" fill="#5D6874"/>' +
        '<rect x="150" y="20" width="120" height="7" rx="3" fill="#A7B2BA"/>' +
        loadPort(130, 48, 64, 30) +
        '</g>' +
        railWheel(80,128,11) + railWheel(222,128,11) + railWheel(360,128,11) +
        '</svg>'
    }
  ];

  /* ============ 接線 ============ */
  var scene   = document.getElementById("scene");
  var rider   = document.getElementById("rider");
  var propsEl = document.getElementById("props");
  var caption = document.getElementById("caption");
  var grid    = document.getElementById("grid");
  var muteBtn = document.getElementById("mute");

  var current = VEHICLES[0];
  var timers = [];
  var busy = false;

  // 開車動畫的起訖，要跟 play.css 的 @keyframes drive 一致
  var DRIVE_FROM = -52, DRIVE_TO = 106, DRIVE_SECONDS = 9;

  // 場景上的車和車庫按鈕會同時出現，clipPath 的 id 必須各自不同
  function uniqueIds(html, suffix){
    return html.replace(/mx-drum/g, "mx-drum-" + suffix);
  }

  function clearTimers(){
    timers.forEach(clearTimeout);
    timers = [];
  }
  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }

  function leftPercentNow(){
    var lane = rider.parentNode.getBoundingClientRect();
    if(!lane.width) return DRIVE_FROM;
    return (rider.getBoundingClientRect().left - lane.left) / lane.width * 100;
  }

  function delayFor(pct){
    return -((pct - DRIVE_FROM) / (DRIVE_TO - DRIVE_FROM)) * DRIVE_SECONDS;
  }

  // 停在原地：把動畫換成固定的 left，位置不跳動
  function freezeAt(pct){
    rider.style.animation = "none";
    rider.style.transition = "none";
    rider.style.left = pct + "%";
    void rider.offsetWidth;
  }

  // 從指定位置接著開，用負的 delay 把動畫捲到對應的進度
  function driveFrom(pct){
    rider.style.transition = "none";
    rider.style.left = "";
    rider.style.animation = "none";
    void rider.offsetWidth;
    rider.style.animation = "";
    rider.style.animationDelay = delayFor(pct) + "s";
  }

  /* 量出每件東西到目標點的實際距離，寫成 CSS 變數讓動畫用。
     這樣不管螢幕多寬，東西都會正好落進車子裡，而不是半路消失。 */
  function aimFlights(v){
    (v.fly || []).forEach(function(f){
      var target = rider.querySelector(f.target) || propsEl.querySelector(f.target);
      if(!target) return;
      var t = target.getBoundingClientRect();
      var tx = t.left + t.width / 2;
      var ty = t.top + t.height / 2;
      Array.prototype.forEach.call(propsEl.querySelectorAll(f.sel), function(el, i){
        var r = el.getBoundingClientRect();
        el.style.setProperty("--dx", (tx - (r.left + r.width / 2)) + "px");
        el.style.setProperty("--dy", (ty - (r.top + r.height / 2)) + "px");
        el.style.setProperty("--fly-delay", (0.35 + i * 0.45) + "s");
      });
    });
  }

  function clearFlights(){
    Array.prototype.forEach.call(propsEl.querySelectorAll(".prop"), function(el){
      el.style.removeProperty("--dx");
      el.style.removeProperty("--dy");
      el.style.removeProperty("--fly-delay");
    });
  }

  function show(v, withSound){
    clearTimers();
    busy = false;
    current = v;

    scene.setAttribute("data-track", v.track);
    rider.innerHTML = uniqueIds(v.svg, "scene");
    rider.setAttribute("aria-label", v.name + "，點一下看它工作");
    propsEl.className = "props";
    propsEl.innerHTML = v.props;
    caption.textContent = "";
    caption.classList.remove("on");
    rider.classList.remove("acting", "loaded");

    // 一開始就停在自己的工作現場旁邊，第一眼就看得到「車 + 要做的事」
    driveFrom(v.stop);

    Array.prototype.forEach.call(grid.children, function(b){
      b.setAttribute("aria-pressed", String(b.dataset.id === v.id));
    });
    if(withSound){ say(v.name); }
  }

  /* 點車子 → 開到現場、停下、把東西搬進車裡（或搬出去）、再繼續開 */
  function doJob(){
    if(busy){ current.jobSound(); return; }  // 連點時至少要有聲音回應
    busy = true;
    clearTimers();

    var v = current;
    var parked = v.stop;

    // 1. 滑到工作現場
    freezeAt(leftPercentNow());
    rider.style.transition = "left .9s cubic-bezier(.32,.72,.3,1)";
    rider.style.left = parked + "%";

    // 2. 停好才量距離，落點才會準
    later(function(){
      aimFlights(v);
      propsEl.classList.add("working");
      rider.classList.add("acting");
      caption.textContent = v.job;
      caption.classList.add("on");
      v.jobSound();
      say(v.job);
    }, 950);

    // 3. 東西都到位了：車斗堆高 / 滾筒裝滿 / 車窗坐滿乘客 / 店裡上架
    later(function(){
      rider.classList.add("loaded");
      propsEl.classList.add("done");
    }, 3050);

    // 4. 收工，一切復原，可以再玩一次
    later(function(){
      caption.classList.remove("on");
      rider.classList.remove("acting", "loaded");
      propsEl.className = "props";
      clearFlights();
      driveFrom(parked);
      busy = false;
    }, 5900);
  }

  VEHICLES.forEach(function(v, i){
    var b = document.createElement("button");
    b.className = "pick";
    b.type = "button";
    b.dataset.id = v.id;
    b.style.setProperty("--tint", v.tint);
    b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.innerHTML = uniqueIds(v.svg, "pick" + i) + "<b>" + v.name + "</b>";
    b.addEventListener("click", function(){
      show(v, true);
      v.sound();
    });
    grid.appendChild(b);
  });

  rider.addEventListener("click", doJob);

  muteBtn.addEventListener("click", function(){
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "開啟聲音" : "靜音");
    if(muted && window.speechSynthesis){ window.speechSynthesis.cancel(); }
  });

  show(VEHICLES[0], false);
})();
