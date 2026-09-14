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

  // 停在停機坪時的渦輪低鳴
  function jetIdle(){
    var a = AC(); if(!a || muted) return;
    noiseBurst({f:700, to:520, dur:1.8, gain:0.08, q:1.6});
    tone({f:220, to:180, dur:1.8, type:"triangle", gain:0.05, lp:900});
  }

  // 起飛：引擎推到底，由低吼拉高成呼嘯
  function takeoffRoar(){
    noiseBurst({f:260, to:1500, dur:2.6, gain:0.24, q:0.6});
    noiseBurst({f:900, to:2600, dur:2.2, at:0.5, gain:0.14, q:0.9});
    tone({f:90, to:260, dur:2.4, type:"sawtooth", gain:0.1, lp:700});
  }

  // 巡航：高空的風聲
  function cruiseHum(){
    noiseBurst({f:1200, to:800, dur:2.4, gain:0.07, q:1.2});
  }

  // 降落：引擎收油，最後輪胎接地
  function landingSound(){
    noiseBurst({f:1400, to:420, dur:2.4, gain:0.13, q:0.9});
    noiseBurst({f:2400, to:900, dur:0.35, at:2.3, gain:0.18, q:2.2});
    tone({f:150, to:80, at:2.3, dur:0.5, type:"triangle", gain:0.14, lp:500});
  }

  // 開走時的道別聲，配合大家揮手
  function byeChime(){
    tone({f:659.25, dur:0.3, type:"triangle", gain:0.16});
    tone({f:880, at:0.22, dur:0.42, type:"triangle", gain:0.16});
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
      '<g class="arm"><rect x="21" y="26" width="7.5" height="21" rx="3.75" fill="' + vest + '"/></g>' +
      '<rect class="hand-port" x="26" y="-14" width="16" height="16" fill="none" pointer-events="none"/>' +
      '</svg>';
  }

  // 場景裡的小孩。工作做完會揮手，把「這是我們的社區」連起來。
  function kid(shirt){
    return '<svg viewBox="0 0 26 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="1.5" y="21" width="4.5" height="12" rx="2.25" fill="' + shirt + '"/>' +
      '<rect x="5" y="19" width="16" height="22" rx="6" fill="' + shirt + '"/>' +
      '<circle cx="13" cy="11" r="9" fill="#F7D8B6"/>' +
      '<path d="M4 9 A 9 9 0 0 1 22 9 Z" fill="#3A2E28"/>' +
      '<circle cx="9.6" cy="12" r="1.7" fill="#2B3138"/>' +
      '<circle cx="16.4" cy="12" r="1.7" fill="#2B3138"/>' +
      '<path d="M9.8 16 Q13 19.2 16.2 16" stroke="#2B3138" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<g class="wave"><rect x="20" y="19" width="4.5" height="13" rx="2.25" fill="' + shirt + '"/></g>' +
      '</svg>';
  }

  // 店員。手在左邊，朝著卡車伸出去接貨。
  function clerk(tint){
    return '<svg viewBox="0 0 30 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="7" y="26" width="18" height="27" rx="6" fill="' + tint + '"/>' +
      '<rect x="7" y="36" width="18" height="17" rx="2" fill="#F4EFE6"/>' +
      '<circle cx="15" cy="16" r="8" fill="#F7D8B6"/>' +
      '<path d="M6 15 A 9 9 0 0 1 24 15 Z" fill="#3A2E28"/>' +
      '<circle cx="12" cy="17" r="1.5" fill="#2B3138"/>' +
      '<circle cx="18" cy="17" r="1.5" fill="#2B3138"/>' +
      '<path d="M12 21 Q15 24 18 21" stroke="#2B3138" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<g class="arm"><rect x="1.5" y="26" width="7.5" height="21" rx="3.75" fill="' + tint + '"/></g>' +
      '<rect class="hand-port" x="-12" y="-14" width="16" height="16" fill="none" pointer-events="none"/>' +
      '</svg>';
  }

  // 出國的旅客：拉著行李箱，一看就知道不是通勤，是要去玩的
  function traveller(tint, bagTint){
    return '<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="26" y="30" width="13" height="17" rx="2" fill="' + bagTint + '"/>' +
      '<rect x="26" y="35" width="13" height="2.5" fill="rgba(255,255,255,.55)"/>' +
      '<rect x="31" y="22" width="2.5" height="9" rx="1.25" fill="#8C98A3"/>' +
      '<rect x="28" y="20" width="9" height="2.5" rx="1.25" fill="#8C98A3"/>' +
      '<circle cx="29" cy="48" r="2" fill="#2B3138"/>' +
      '<circle cx="36" cy="48" r="2" fill="#2B3138"/>' +
      '<rect x="19" y="23" width="5" height="13" rx="2.5" fill="' + tint + '"/>' +
      '<rect x="4" y="22" width="16" height="26" rx="6" fill="' + tint + '"/>' +
      '<circle cx="12" cy="12" r="8" fill="#F7D8B6"/>' +
      '<path d="M4 10 A 8 8 0 0 1 20 10 Z" fill="#3A2E28"/>' +
      '<circle cx="9" cy="13" r="1.5" fill="#2B3138"/>' +
      '<circle cx="15" cy="13" r="1.5" fill="#2B3138"/>' +
      '<path d="M9.5 17 Q12 19.6 14.5 17" stroke="#2B3138" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
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

  // 四個目的地的地標。每飛一趟換一個國家，這是飛機獨有的重玩價值。
  var DESTINATIONS = [
    { id:"jp", name:"日本", say:"飛機降落在日本，那裡有好高的富士山",
      svg:'<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M6 106 L80 14 L154 106 Z" fill="#6E8FB8"/>' +
        '<path d="M54 46 L80 14 L106 46 Q92 38 80 44 Q68 38 54 46 Z" fill="#F7FAFC"/>' +
        '<path d="M26 106 Q54 76 80 88 Q108 76 134 106 Z" fill="#5B7BA3"/>' +
        '</svg>' },
    { id:"fr", name:"法國", say:"飛機降落在法國，那裡有尖尖的鐵塔",
      svg:'<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M62 108 Q72 58 80 8 Q88 58 98 108 L86 108 Q82 60 80 34 Q78 60 74 108 Z" fill="#A6784A"/>' +
        '<rect x="66" y="72" width="28" height="7" rx="2" fill="#A6784A"/>' +
        '<rect x="71" y="48" width="18" height="6" rx="2" fill="#A6784A"/>' +
        '<path d="M60 108 Q80 84 100 108 Z" fill="#8C6339"/>' +
        '<circle cx="80" cy="6" r="3" fill="#C99A63"/>' +
        '</svg>' },
    { id:"eg", name:"埃及", say:"飛機降落在埃及，那裡有大大的金字塔",
      svg:'<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M4 106 L54 30 L104 106 Z" fill="#DFC184"/>' +
        '<path d="M54 30 L104 106 L74 106 Z" fill="#C9A868"/>' +
        '<path d="M92 106 L124 62 L156 106 Z" fill="#E8CE96"/>' +
        '<path d="M124 62 L156 106 L138 106 Z" fill="#D2B173"/>' +
        '</svg>' },
    { id:"au", name:"澳洲", say:"飛機降落在澳洲，那裡有像貝殼的房子",
      svg:'<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<rect x="8" y="96" width="144" height="12" rx="3" fill="#C2B7A6"/>' +
        '<path d="M26 96 Q30 44 74 96 Z" fill="#FAFCFD"/>' +
        '<path d="M52 96 Q58 36 102 96 Z" fill="#ECF1F4"/>' +
        '<path d="M80 96 Q88 50 126 96 Z" fill="#FAFCFD"/>' +
        '<path d="M106 96 Q114 62 140 96 Z" fill="#ECF1F4"/>' +
        '</svg>' }
  ];

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
      thanks:"謝謝垃圾車，我們住的地方才乾淨",
      stop:44,
      jobSound:function(){ furElise(); LAND.forEach(thud); },
      fly:[{sel:".bag", via:".worker .hand-port", target:".load-port", step:1.2, first:0.3}],
      jobMs:7200,
      props:
        prop("bag b1", 27, 30, 5.8, BAG) +
        prop("bag b2", 32, 30, 5.8, BAG) +
        prop("bag b3", 37, 30, 5.8, BAG) +
        prop("worker", 43, 30, 5.6, worker("#F5A524")) +
        prop("kid", 15, 30, 4.4, kid("#E0653F")),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="垃圾車">' +
        '<g class="body">' +
        '<rect x="82" y="52" width="212" height="72" rx="8" fill="#EFC81C"/>' +
        '<rect x="82" y="52" width="212" height="16" rx="6" fill="#D3AE10"/>' +
        // 車斗裡越堆越高的垃圾
        '<g class="fill-steps"><rect x="90" y="64" width="196" height="56" rx="4" fill="#4E7D34"/>' +
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
      /* 水泥車的意義是蓋房子，所以要演完整條因果鏈：
         工人把砂石裝進滾筒 → 滾筒轉 → 水泥送到工地 → 房子一層一層蓋起來。 */
      id:"mixer", name:"水泥車", tint:"#EE7B2E", track:"road",
      sound:engineRumble,
      job:"砂石裝進滾筒，水泥車把水泥送到工地",
      thanks:"有了水泥車，才蓋得出我們住的房子",
      stop:30,
      jobMs:9200,
      jobSound:function(){
        engineRumble(); LAND.forEach(gravel);
        thud(4.6); thud(5.1); thud(5.6);
      },
      fly:[
        { sel:".rock",  via:".worker .hand-port", target:".load-port", step:1.2,  first:0.3 },
        { sel:".crete", target:".site-port",      step:0.45, first:3.2 }
      ],
      props:
        prop("pile", 3, 28, 20,
          '<svg viewBox="0 0 140 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path class="pile-body" d="M4 52 Q34 10 70 20 Q104 8 136 52 Z" fill="#A8916F"/>' +
          '<path class="pile-body" d="M20 52 Q44 28 70 34 Q98 26 120 52 Z" fill="#8E7856"/>' +
          '</svg>') +
        prop("rock r1", 7, 40, 4.6, rock("#B9A484")) +
        prop("rock r2", 12, 43, 5.0, rock("#A8916F")) +
        prop("rock r3", 17, 40, 4.4, rock("#C0AB8A")) +
        prop("worker", 24, 28, 5.6, worker("#E86A1F")) +
        // 水泥。一開始藏在車身後面，倒出來才看得到，像是從車上送出去的。
        prop("crete c1", 44, 42, 4.2, rock("#9C9082")) +
        prop("crete c2", 49, 45, 4.6, rock("#8A7F70")) +
        prop("crete c3", 54, 42, 4.0, rock("#A8A096")) +
        // 工地：水泥一到，房子就一層一層長出來
        prop("site", 74, 100, 24,
          '<svg viewBox="0 0 120 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="2" y="102" width="116" height="8" rx="3" fill="#A89880"/>' +
          '<rect class="build bd1" x="10" y="92" width="100" height="11" rx="2" fill="#B9BFC4"/>' +
          '<rect class="build bd2" x="16" y="46" width="88" height="47" fill="#F0E4D2"/>' +
          '<path class="build bd3" d="M4 49 L60 13 L116 49 Z" fill="#C0603F"/>' +
          '<g class="build bd4">' +
          '<rect x="50" y="66" width="20" height="27" rx="2" fill="#8A6A4F"/>' +
          '<rect x="24" y="56" width="18" height="16" rx="2" fill="#BFE3F2"/>' +
          '<rect x="78" y="56" width="18" height="16" rx="2" fill="#BFE3F2"/>' +
          '</g>' +
          '<rect class="site-port" x="38" y="86" width="44" height="16" fill="none" pointer-events="none"/>' +
          '</svg>') +
        prop("kid", 70, 30, 4.4, kid("#2F7FD1")),
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
      thanks:"消防員把火滅掉，大家就安全了",
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
          '<g class="splash">' +
          '<circle class="sp s1" cx="44" cy="10" r="9" fill="#BFE3F2"/>' +
          '<circle class="sp s2" cx="74" cy="4" r="7" fill="#DCF0F8"/>' +
          '<circle class="sp s3" cx="58" cy="-6" r="8" fill="#A8DCF0"/>' +
          '</g>' +
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
          '</svg>') +
        prop('kid', 8, 30, 4.4, kid('#3C8C3C')),
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
        // 水柱本身。SVG 是翻面的，所以往 -x 畫等於畫向畫面右邊的房子。
        '<path class="jet jet-a" d="M150 22 Q -14 -146 -200 -104" stroke="#7EC8F0" stroke-width="17" fill="none" stroke-linecap="round"/>' +
        '<path class="jet jet-b" d="M150 26 Q -10 -132 -194 -94" stroke="#CDEBFA" stroke-width="8" fill="none" stroke-linecap="round"/>' +
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
      job:"卡車把貨物搬下來，一箱一箱交給店員",
      thanks:"卡車送貨來，店裡才有東西可以買",
      jobMs:7600,
      stop:16,
      jobSound:function(){ truckHorn(); LAND.forEach(thud); },
      fly:[{sel:".box", via:".worker .hand-port", target:".clerk .hand-port", step:1.2, first:0.3}],
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
        prop("clerk", 78, 100, 5.4, clerk("#3C8C3C")) +
        prop("worker", 60, 30, 5.6, worker("#2F7FD1")) +
        prop("box x1", 28, 30, 5.5, BOX) +
        prop("box x2", 34, 30, 5.5, BOX) +
        prop("box x3", 40, 30, 5.5, BOX) +
        prop("kid", 6, 30, 4.4, kid("#7A4FA8")),
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
      /* 飛機是唯一會「換一個地方」的一台：起飛、飛過海、降落在別的國家。
         所以它多了垂直方向的移動，還有一段場景切換。
         class 一律用 pl- 開頭，避免跟其他車的撞名。 */
      id:"plane", name:"飛機", tint:"#2F7FD1", track:"sky",
      sound:jetIdle,
      job:"旅客拉著行李上飛機，要飛去很遠的國家",
      thanks:"坐飛機，就能去看看不一樣的地方",
      stop:20,
      jobMs:13200,
      loadedMs:3500,   // 登機完就看得到窗戶裡有人
      doneMs:11100,    // 但要飛到別的國家才算完成
      extra:function(ctx){
        var dest = DESTINATIONS[flightNo % DESTINATIONS.length];
        flightNo++;

        // 空橋收回、艙門關上
        ctx.later(function(){
          ctx.props.setAttribute('data-pl','sealed');
          ctx.rider.classList.add('pl-sealed');
        }, 3900);

        // 起飛：推力全開，機頭抬起，往右上方爬升出畫面
        ctx.later(function(){
          takeoffRoar();
          ctx.rider.classList.add('pl-airborne');
          ctx.rider.style.transition = 'left 3s cubic-bezier(.45,0,.75,.6), bottom 3s cubic-bezier(.5,0,.9,.7), transform .9s ease-out';
          ctx.rider.style.left = '118%';
          ctx.rider.style.bottom = '300%';
          ctx.rider.style.transform = 'rotate(-14deg)';
        }, 4300);

        // 飛越大海：海面出現、雲飛快、遠方一架小飛機經過
        ctx.later(function(){
          cruiseHum();
          ctx.scene.setAttribute('data-phase','cruise');
          ctx.caption.textContent = '飛機飛過好大的海，要去很遠的國家';
          ctx.say('飛機飛過好大的海，要去很遠的國家');
        }, 5300);

        // 目的地的地標從遠方浮現
        ctx.later(function(){ ctx.props.setAttribute('data-dest', dest.id); }, 7500);

        // 降落：從左邊高空滑下來，機頭拉平，輪胎接地
        ctx.later(function(){
          landingSound();
          ctx.rider.style.transition = 'none';
          ctx.rider.style.left = '-52%';
          ctx.rider.style.bottom = '290%';
          ctx.rider.style.transform = 'rotate(6deg)';
          void ctx.rider.offsetWidth;
          ctx.rider.classList.remove('pl-airborne');
          ctx.rider.style.transition = 'left 2.9s cubic-bezier(.3,0,.5,1), bottom 2.9s cubic-bezier(.35,0,.45,1), transform 2.9s ease-in-out';
          ctx.rider.style.left = '20%';
          ctx.rider.style.bottom = '22%';
          ctx.rider.style.transform = 'rotate(0deg)';
        }, 7900);

        // 到了：海退去，旅客拉著行李下飛機
        ctx.later(function(){
          ctx.scene.setAttribute('data-phase','arrived');
          ctx.rider.classList.remove('loaded');
          ctx.props.setAttribute('data-pl','arrived');
          ctx.say(dest.say);
        }, 10900);
      },
      jobSound:jetIdle,
      fly:[{ sel:".pax-in", target:".load-port", step:0.45, first:0.3 }],
      props:
        // 航廈與空橋
        prop("pl-term", 0, 100, 18,
          '<svg viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="4" y="26" width="112" height="70" rx="5" fill="#E7EDF1"/>' +
          '<rect x="4" y="26" width="112" height="10" rx="5" fill="#2F7FD1"/>' +
          '<rect x="14" y="46" width="26" height="20" rx="3" fill="#BFE3F2"/>' +
          '<rect x="48" y="46" width="26" height="20" rx="3" fill="#BFE3F2"/>' +
          '<rect x="82" y="46" width="26" height="20" rx="3" fill="#BFE3F2"/>' +
          '<rect x="48" y="74" width="26" height="22" rx="2" fill="#8A6A4F"/>' +
          '<rect x="52" y="6" width="5" height="22" fill="#A7B2BA"/>' +
          '<rect x="44" y="0" width="21" height="9" rx="3" fill="#8C98A3"/>' +
          '</svg>') +
        prop("pl-bridge", 17, 120, 28,
          '<svg viewBox="0 0 90 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="0" y="2" width="90" height="18" rx="6" fill="#CBD5DC"/>' +
          '<rect x="0" y="2" width="90" height="5" rx="3" fill="#E3EAEF"/>' +
          '<rect x="16" y="20" width="7" height="6" fill="#9AA6AE"/>' +
          '<rect x="64" y="20" width="7" height="6" fill="#9AA6AE"/>' +
          '</svg>') +
        // 排隊等登機的旅客
        prop("pax-in w1", 5, 22, 4.6, traveller("#E0653F", "#2F7FD1")) +
        prop("pax-in w2", 10.5, 22, 4.6, traveller("#2F7FD1", "#E0653F")) +
        prop("pax-in w3", 16, 22, 4.6, traveller("#7A4FA8", "#3C8C3C")) +
        // 巡航時遠方那架小小的飛機，讓「飛過大海」這一段不會只有空景
        prop("pl-far", 6, 300, 9,
          '<svg viewBox="0 0 120 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path d="M4 20 Q40 10 96 12 L114 16 L96 22 Q40 26 4 20 Z" fill="#FAFCFD"/>' +
          '<path d="M44 14 L58 0 L70 2 L60 14 Z" fill="#E3EAEF"/>' +
          '<path d="M44 20 L58 32 L70 30 L60 20 Z" fill="#E3EAEF"/>' +
          '</svg>') +
        // 四個目的地都先放好，降落前才顯示抽到的那一個
        DESTINATIONS.map(function(d){
          return prop("pl-dest pl-" + d.id, 62, 100, 26, d.svg);
        }).join("") +
        prop("pl-out o1", 78, 22, 4.6, traveller("#E0653F", "#2F7FD1")) +
        prop("pl-out o2", 84, 22, 4.6, traveller("#2F7FD1", "#E0653F")) +
        prop("pl-out o3", 90, 22, 4.6, traveller("#7A4FA8", "#3C8C3C")) +
        prop("kid", 93, 22, 4.4, kid("#E0653F")),
      svg: '<svg viewBox="0 0 520 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="飛機">' +
        '<g class="body">' +
        // 機翼（後方）
        '<path d="M188 96 L96 150 L140 152 L246 108 Z" fill="#D5DEE4"/>' +
        // 尾翼
        '<path d="M436 88 L470 16 L494 16 L482 88 Z" fill="#2F7FD1"/>' +
        '<path d="M430 88 L470 78 L500 96 L436 100 Z" fill="#C6D2DA"/>' +
        // 機身
        '<path d="M28 92 Q60 60 150 56 L432 56 Q478 58 492 92 Q478 112 432 114 L150 114 Q60 110 28 92 Z" fill="#FAFCFD"/>' +
        '<path d="M28 92 Q60 60 150 56 L432 56 Q478 58 492 92 Q478 112 432 114 L150 114 Q60 110 28 92 Z" fill="none" stroke="#D5DEE4" stroke-width="3"/>' +
        '<rect x="70" y="96" width="400" height="9" rx="4" fill="#2F7FD1"/>' +
        // 駕駛艙
        '<path d="M40 88 Q58 70 92 66 L104 66 L104 86 L38 90 Z" fill="#28323B"/>' +
        // 客艙窗戶與乘客
        '<rect x="128" y="74" width="22" height="13" rx="4" fill="#4B5A66"/>' +
        '<rect x="170" y="74" width="22" height="13" rx="4" fill="#4B5A66"/>' +
        '<rect x="290" y="74" width="22" height="13" rx="4" fill="#4B5A66"/>' +
        '<rect x="332" y="74" width="22" height="13" rx="4" fill="#4B5A66"/>' +
        '<rect x="374" y="74" width="22" height="13" rx="4" fill="#4B5A66"/>' +
        paxHead(139, 80, 6, "#E0653F", 1) + paxHead(181, 80, 6, "#2F7FD1", 2) +
        paxHead(301, 80, 6, "#7A4FA8", 3) + paxHead(343, 80, 6, "#3C8C3C", 4) +
        paxHead(385, 80, 6, "#E0653F", 5) +
        // 艙門，登機時打開
        '<g class="pl-door"><rect x="212" y="66" width="60" height="44" rx="6" fill="#DCE4E9"/>' +
        '<rect x="218" y="72" width="48" height="32" rx="4" fill="#28323B"/></g>' +
        loadPort(214, 68, 56, 40) +
        // 引擎
        '<ellipse cx="214" cy="122" rx="36" ry="19" fill="#C6D2DA"/>' +
        '<ellipse cx="214" cy="122" rx="36" ry="19" fill="none" stroke="#A7B2BA" stroke-width="3"/>' +
        '<ellipse cx="246" cy="122" rx="7" ry="17" fill="#5D6874"/>' +
        '</g>' +
        // 起落架，起飛後收起
        '<g class="pl-gear">' +
        '<rect x="78" y="110" width="7" height="26" rx="3" fill="#8C98A3"/>' +
        '<rect x="238" y="128" width="7" height="20" rx="3" fill="#8C98A3"/>' +
        '<circle cx="81" cy="142" r="11" fill="#2B3138"/>' +
        '<circle cx="241" cy="152" r="12" fill="#2B3138"/>' +
        '<circle cx="81" cy="142" r="4" fill="#C9D1D9"/>' +
        '<circle cx="241" cy="152" r="4.5" fill="#C9D1D9"/>' +
        '</g>' +
        '</svg>'
    },
    {
      id:"thsr", name:"高鐵", tint:"#F26A21", track:"viaduct",
      sound:whoosh,
      job:"乘客走進車廂坐好，高鐵載大家去很遠的地方",
      thanks:"搭高鐵，就能去看住在遠方的家人",
      jobMs:6600,
      stop:14,
      jobSound:function(){ dingDing(); whoosh(); },
      fly:[{sel:".pax-in", target:".load-port"}],
      props:
        prop("deck", 76, 46, 20, DECK) +
        prop("pax-in w1", 79, 52, 2.6, personSvg("#E0653F")) +
        prop("pax-in w2", 84, 52, 2.6, personSvg("#2F7FD1")) +
        prop("pax-in w3", 89, 52, 2.6, personSvg("#7A4FA8")) +
        prop("kid", 93, 52, 2.8, kid("#3C8C3C")),
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
        '<g class="door-set">' +
        '<rect class="door-l" x="150" y="40" width="27" height="52" rx="3" fill="#3A4650"/>' +
        '<rect class="door-r" x="177" y="40" width="27" height="52" rx="3" fill="#3A4650"/>' +
        '</g>' +
        loadPort(152, 52, 56, 24) +
        '</g>' +
        railWheel(120,122,12) + railWheel(260,122,12) + railWheel(410,122,12) +
        '</svg>'
    },
    {
      id:"lrt", name:"輕軌", tint:"#00A167", track:"grass",
      sound:dingDing,
      job:"輕軌到站開門，大家走進車廂坐好囉",
      thanks:"輕軌每天載大家上學、上班",
      jobMs:6400,
      stop:22,
      jobSound:function(){ dingDing(); },
      fly:[{sel:".pax-in", target:".load-port"}],
      props:
        prop("deck", 72, 30, 20, DECK) +
        prop("pax-in w1", 75, 36, 2.8, personSvg("#E0653F")) +
        prop("pax-in w2", 80, 36, 2.8, personSvg("#2F7FD1")) +
        prop("pax-in w3", 85, 36, 2.8, personSvg("#7A4FA8")) +
        prop("kid", 89, 36, 3.0, kid("#E0653F")),
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
  var flightNo = 0;   // 飛機每飛一趟就換下一個目的地
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
      function find(sel){ return sel && (rider.querySelector(sel) || propsEl.querySelector(sel)); }
      function centre(el){
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      var target = find(f.target);
      if(!target) return;
      var t = centre(target);
      var handEl = find(f.via);
      var hand = handEl ? centre(handEl) : null;
      var first = f.first == null ? 0.35 : f.first;
      var step  = f.step  == null ? 0.45 : f.step;
      Array.prototype.forEach.call(propsEl.querySelectorAll(f.sel), function(el, i){
        var o = centre(el);
        el.style.setProperty('--dx', (t.x - o.x) + 'px');
        el.style.setProperty('--dy', (t.y - o.y) + 'px');
        if(hand){
          el.style.setProperty('--hx', (hand.x - o.x) + 'px');
          el.style.setProperty('--hy', (hand.y - o.y) + 'px');
        }
        if(hand){
          // 拋出去的中段位置先算好，keyframes 只要讀變數就好
          el.style.setProperty('--mx', ((hand.x - o.x) + (t.x - hand.x) * 0.55) + 'px');
          el.style.setProperty('--my', ((hand.y - o.y) + (t.y - hand.y) * 0.55 - 22) + 'px');
        } else {
          el.style.setProperty('--mx', ((t.x - o.x) * 0.55) + 'px');
          el.style.setProperty('--my', ((t.y - o.y) * 0.55 - 30) + 'px');
        }
        el.style.setProperty('--fly-delay', (first + i * step) + 's');
      });
    });
  }

  function clearFlights(){
    Array.prototype.forEach.call(propsEl.querySelectorAll(".prop"), function(el){
      el.style.removeProperty("--dx");
      el.style.removeProperty("--dy");
      el.style.removeProperty("--hx");
      el.style.removeProperty("--hy");
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
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
    propsEl.removeAttribute("data-dest");
    propsEl.removeAttribute("data-pl");
    scene.removeAttribute("data-phase");
    propsEl.innerHTML = v.props;
    caption.textContent = "";
    caption.classList.remove("on");
    rider.classList.remove("acting", "loaded", "pl-airborne", "pl-sealed");

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
    var jobMs = v.jobMs || 5900;
    // 大部分的車「裝滿」和「工作完成」是同一刻；飛機不是，它要飛到別的
    // 國家才算完成，所以這兩個時間點可以各自指定。
    var loadedMs = v.loadedMs != null ? v.loadedMs : Math.max(1600, jobMs - 2400);
    var doneMs   = v.doneMs   != null ? v.doneMs   : loadedMs;

    // 1. 減速滑進工作現場
    freezeAt(leftPercentNow());
    rider.style.transition = 'left 1.2s cubic-bezier(.18,.7,.25,1)';
    rider.style.left = parked + '%';

    // 2. 停好才量距離，東西的落點才會準
    later(function(){
      aimFlights(v);
      propsEl.classList.add('working');
      rider.classList.add('acting');
      caption.textContent = v.job;
      caption.classList.add('on');
      v.jobSound();
      say(v.job);
      if(v.extra){ v.extra({ later: later, rider: rider, scene: scene, props: propsEl, caption: caption, say: say }); }
    }, 1250);

    // 3. 車子看得出來裝到東西了
    later(function(){ rider.classList.add('loaded'); }, loadedMs);

    // 4. 工作完成：講出這件事對大家的意義，大家互相揮手
    later(function(){
      propsEl.classList.add('done');
      if(v.thanks){
        caption.textContent = v.thanks;
        say(v.thanks);
      }
    }, doneMs);

    // 5. 收工，一切復原，然後加速開走
    later(function(){
      caption.classList.remove('on');
      rider.classList.remove('acting', 'loaded', 'pl-airborne', 'pl-sealed');
      propsEl.className = 'props';
      propsEl.removeAttribute('data-dest');
      propsEl.removeAttribute('data-pl');
      scene.removeAttribute('data-phase');
      clearFlights();

      var away = Math.min(parked + 34, 104);
      rider.style.bottom = '';
      rider.style.transform = '';
      rider.style.transition = 'left 1.8s cubic-bezier(.5,0,.85,.55)';
      rider.style.left = away + '%';
      byeChime();

      later(function(){
        driveFrom(away);
        busy = false;
      }, 1820);
    }, jobMs);
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

  /* 車子一直在移動，要求小孩精準點中它太難了。
     整個場景都可以點，只避開右上角給家長用的靜音鍵。 */
  scene.addEventListener("click", function(e){
    if(e.target.closest && e.target.closest(".mute")) return;
    doJob();
  });

  muteBtn.addEventListener("click", function(){
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "開啟聲音" : "靜音");
    if(muted && window.speechSynthesis){ window.speechSynthesis.cancel(); }
  });

  show(VEHICLES[0], false);
})();
