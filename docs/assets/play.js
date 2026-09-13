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
    var t0 = c.currentTime, dur = 1.9;
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
    g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.12);
    g.gain.setValueAtTime(0.3, t0 + dur*0.6);
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

  // 水柱聲：噴的時候用
  function waterSpray(){
    noiseBurst({f:1800, to:900, dur:1.3, gain:0.13, q:0.8});
  }

  // 倒水泥：低沉的嘩啦
  function pourSound(){
    noiseBurst({f:520, to:180, dur:1.5, gain:0.16, q:0.6});
  }

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

  /* ============ 工作現場的道具 ============ */
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

  // 外層 g 負責擺位置，內層 g 才掛 class：CSS 的 transform 會蓋掉
  // presentation attribute，分兩層才不會動畫一跑就跳回原點
  function person(x, tint, n){
    return '<g transform="translate(' + x + ' 0)">' +
      '<g class="person p' + n + '">' +
      '<circle cx="9" cy="9" r="7" fill="#4A5A66"/>' +
      '<rect x="2" y="18" width="14" height="24" rx="6" fill="' + tint + '"/>' +
      '</g></g>';
  }

  var PLATFORM =
    '<svg viewBox="0 0 96 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="0" y="46" width="96" height="16" rx="3" fill="#C4CDD4"/>' +
    '<rect x="0" y="46" width="96" height="5" rx="2" fill="#DCE3E8"/>' +
    person(14, "#E0653F", 1) + person(40, "#2F7FD1", 2) + person(66, "#7A4FA8", 3) +
    '</svg>';

  var VEHICLES = [
    {
      id:"garbage", name:"垃圾車", tint:"#E3B90A", track:"road", sound:furElise,
      job:"垃圾車把垃圾載走，馬路就變乾淨了",
      stop:22,
      jobSound:furElise,
      props:
        prop("bag b1", 68, 30, 5.5, BAG) +
        prop("bag b2", 73, 30, 5.5, BAG) +
        prop("bag b3", 78, 30, 5.5, BAG),
      svg: '<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="垃圾車">' +
        '<g class="body">' +
        '<rect x="82" y="52" width="212" height="72" rx="8" fill="#EFC81C"/>' +
        '<rect x="82" y="52" width="212" height="16" rx="6" fill="#D3AE10"/>' +
        '<rect x="252" y="38" width="66" height="86" rx="8" fill="#D3AE10"/>' +
        '<rect x="262" y="50" width="46" height="26" rx="5" fill="#B8970B"/>' +
        '<rect x="306" y="86" width="26" height="10" rx="4" fill="#7E8791"/>' +
        '<path d="M18 124 L18 70 Q18 58 30 56 L62 52 L84 52 L84 124 Z" fill="#F5D430"/>' +
        '<path d="M30 66 L74 62 L74 92 L28 92 Z" fill="#BFE3F2"/>' +
        '<path d="M30 66 L52 64 L36 92 L28 92 Z" fill="#DCF0F8"/>' +
        '<rect x="16" y="104" width="14" height="18" rx="4" fill="#5D6874"/>' +
        '<rect x="94" y="76" width="148" height="8" rx="4" fill="#FFFFFF" opacity=".85"/>' +
        '<rect x="120" y="92" width="96" height="22" rx="5" fill="#3C8C3C"/>' +
        '<rect x="126" y="98" width="84" height="4" rx="2" fill="#6FBF6F"/>' +
        '<g class="notes"><text x="200" y="42" font-size="34" fill="#2E7D32">&#9834;</text></g>' +
        '<g class="notes n2"><text x="238" y="46" font-size="26" fill="#43A047">&#9835;</text></g>' +
        '<g class="notes n3"><text x="170" y="44" font-size="22" fill="#2E7D32">&#9834;</text></g>' +
        '</g>' +
        wheel(120,132,26) + wheel(226,132,26) + wheel(288,132,26) +
        '</svg>'
    },
    {
      id:"mixer", name:"水泥車", tint:"#EE7B2E", track:"road", sound:engineRumble,
      job:"水泥車載水泥來，把地鋪得平平的",
      stop:20,
      jobSound:function(){ engineRumble(); pourSound(); },
      props:
        prop("site", 66, 28, 26,
          '<svg viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path class="dirt" d="M4 36 Q22 12 44 22 Q66 6 92 20 Q120 10 156 36 Z" fill="#A1703F"/>' +
          '<path class="dirt" d="M14 36 Q30 24 44 30 Q62 22 78 30 Q96 22 116 34 Z" fill="#8A5C30"/>' +
          '<rect class="slab" x="2" y="24" width="156" height="14" rx="3" fill="#B9BFC4"/>' +
          '<rect class="slab" x="2" y="24" width="156" height="4" rx="2" fill="#D2D7DB"/>' +
          '</svg>'),
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
        '<ellipse cx="216" cy="74" rx="94" ry="46" fill="none" stroke="#C85E17" stroke-width="5"/>' +
        '<path d="M306 60 L348 84 L344 104 L300 92 Z" fill="#B8B0A4"/>' +
        '<rect x="330" y="98" width="22" height="26" rx="4" fill="#9A9184"/>' +
        '<path d="M14 126 L14 70 Q14 58 26 56 L58 50 L80 50 L80 126 Z" fill="#E85D2A"/>' +
        '<path d="M26 66 L70 60 L70 90 L24 90 Z" fill="#BFE3F2"/>' +
        '<path d="M26 66 L48 62 L32 90 L24 90 Z" fill="#DCF0F8"/>' +
        '<rect x="12" y="106" width="14" height="18" rx="4" fill="#5D6874"/>' +
        '</g>' +
        wheel(114,134,26) + wheel(228,134,26) + wheel(290,134,26) +
        '</svg>'
    },
    {
      id:"fire", name:"消防車", tint:"#E03131", track:"road", sound:siren,
      job:"房子失火了，消防車噴水把火滅掉",
      stop:18,
      jobSound:function(){ siren(); waterSpray(); },
      props:
        prop("house", 70, 100, 20,
          '<svg viewBox="0 0 120 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<g class="flames">' +
          '<path class="flame f1" d="M44 40 Q36 24 46 10 Q50 24 60 16 Q66 32 54 42 Z" fill="#F5822B"/>' +
          '<path class="flame f2" d="M64 38 Q58 26 68 14 Q71 26 79 20 Q84 33 74 40 Z" fill="#F2B01E"/>' +
          '<path class="flame f3" d="M52 42 Q48 32 56 24 Q58 33 64 28 Q68 38 60 44 Z" fill="#F5D430"/>' +
          '</g>' +
          '<g class="smoke">' +
          '<circle class="puff p1" cx="50" cy="34" r="11" fill="#B9C2C9"/>' +
          '<circle class="puff p2" cx="66" cy="30" r="8" fill="#CBD3D9"/>' +
          '<circle class="puff p3" cx="58" cy="26" r="6" fill="#DEE4E8"/>' +
          '</g>' +
          '<path d="M8 54 L60 22 L112 54 Z" fill="#C0603F"/>' +
          '<rect x="20" y="52" width="80" height="58" fill="#F0E4D2"/>' +
          '<rect x="20" y="52" width="80" height="5" fill="#DCCDB6"/>' +
          '<rect x="50" y="80" width="20" height="30" rx="2" fill="#8A6A4F"/>' +
          '<rect x="28" y="64" width="16" height="14" rx="2" fill="#BFE3F2"/>' +
          '<rect x="76" y="64" width="16" height="14" rx="2" fill="#BFE3F2"/>' +
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
        '<g class="spray"><circle cx="162" cy="20" r="9" fill="#7EC8F0" opacity=".9"/></g>' +
        '<g class="spray s2"><circle cx="162" cy="26" r="6" fill="#A8DCF0" opacity=".9"/></g>' +
        '<g class="spray s3"><circle cx="162" cy="14" r="7" fill="#5FB8E6" opacity=".9"/></g>' +
        '</g>' +
        wheel(116,134,26) + wheel(250,134,26) + wheel(312,134,26) +
        '</svg>'
    },
    {
      id:"truck", name:"卡車", tint:"#2F7FD1", track:"road", sound:truckHorn,
      job:"卡車把貨物送到店裡，店裡就有東西賣了",
      stop:16,
      jobSound:truckHorn,
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
          '</svg>') +
        prop("box x1", 62, 30, 5.5, BOX) +
        prop("box x2", 67, 30, 5.5, BOX),
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
      id:"thsr", name:"高鐵", tint:"#F26A21", track:"viaduct", sound:whoosh,
      job:"高鐵跑得好快，載大家去很遠的地方",
      stop:14,
      jobSound:whoosh,
      props: prop("platform", 78, 50, 16, PLATFORM),
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
        '<rect x="330" y="14" width="70" height="8" rx="4" fill="#7C8892"/>' +
        '<path d="M352 34 L340 16 M378 34 L392 16" stroke="#7C8892" stroke-width="5" fill="none"/>' +
        '<rect x="16" y="104" width="482" height="10" rx="3" fill="#5D6874"/>' +
        '</g>' +
        railWheel(120,122,12) + railWheel(260,122,12) + railWheel(410,122,12) +
        '</svg>'
    },
    {
      id:"lrt", name:"輕軌", tint:"#00A167", track:"grass", sound:dingDing,
      job:"輕軌到站了，叮叮，大家上車囉",
      stop:22,
      jobSound:dingDing,
      props: prop("platform", 72, 40, 15, PLATFORM),
      svg: '<svg viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="輕軌">' +
        '<g class="body">' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="#FBFDFD"/>' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="none" stroke="#D5DEE4" stroke-width="3"/>' +
        '<path d="M12 96 Q12 44 56 42 L120 42 L120 78 L12 78 Z" fill="#28323B"/>' +
        '<rect class="door" x="132" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect class="door" x="204" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect class="door" x="276" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect x="348" y="48" width="66" height="30" rx="5" fill="#28323B"/>' +
        '<rect x="12" y="88" width="414" height="12" fill="#00A167"/>' +
        '<rect x="12" y="100" width="414" height="5" fill="#7FD0AE"/>' +
        '<rect x="196" y="34" width="8" height="78" fill="#E7EDF1"/>' +
        '<rect x="268" y="34" width="8" height="78" fill="#E7EDF1"/>' +
        '<circle cx="34" cy="68" r="7" fill="#FFE082"/>' +
        '<rect x="12" y="112" width="414" height="10" rx="3" fill="#5D6874"/>' +
        '<rect x="150" y="20" width="120" height="7" rx="3" fill="#A7B2BA"/>' +
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

  // 停在原地：把動畫換成固定的 left，位置不跳動
  function freezeAt(pct){
    rider.style.animation = "none";
    rider.style.transition = "none";
    rider.style.left = pct + "%";
    void rider.offsetWidth;
  }

  // 從指定位置接著開，用負的 delay 把動畫捲到對應的進度
  function resumeFrom(pct){
    var progress = (pct - DRIVE_FROM) / (DRIVE_TO - DRIVE_FROM);
    rider.style.transition = "none";
    rider.style.left = "";
    rider.style.animation = "";
    rider.style.animationDelay = (-progress * DRIVE_SECONDS) + "s";
  }

  function resetMotion(){
    rider.style.transition = "none";
    rider.style.left = "";
    rider.style.animation = "none";
    void rider.offsetWidth;
    rider.style.animation = "";
    rider.style.animationDelay = "";
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
    rider.classList.remove("acting");
    resetMotion();

    Array.prototype.forEach.call(grid.children, function(b){
      b.setAttribute("aria-pressed", String(b.dataset.id === v.id));
    });
    if(withSound){ say(v.name); }
  }

  /* 點車子 → 開到工作現場、停下來、把工作做完、再繼續開 */
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

    // 2. 到了就開工
    later(function(){
      propsEl.classList.add("working");
      rider.classList.add("acting");
      caption.textContent = v.job;
      caption.classList.add("on");
      v.jobSound();
      say(v.job);
    }, 950);

    // 3. 工作完成，現場變乾淨 / 變好
    later(function(){ propsEl.classList.add("done"); }, 3200);

    // 4. 收工，恢復原狀讓他可以再玩一次
    later(function(){
      caption.classList.remove("on");
      rider.classList.remove("acting");
      propsEl.className = "props";
      resumeFrom(parked);
      busy = false;
    }, 5200);
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
