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
      u.lang = "zh-TW"; u.rate = 0.82; u.pitch = 1.15;
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

  var VEHICLES = [
    {
      id:"garbage", name:"垃圾車", tint:"#E3B90A", track:"road", sound:furElise,
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
        '<circle cx="340" cy="80" r="9" fill="#9EA7AF"/>' +
        '<g class="spray"><circle cx="352" cy="78" r="9" fill="#7EC8F0" opacity=".9"/></g>' +
        '<g class="spray s2"><circle cx="352" cy="84" r="6" fill="#A8DCF0" opacity=".9"/></g>' +
        '<g class="spray s3"><circle cx="352" cy="72" r="7" fill="#5FB8E6" opacity=".9"/></g>' +
        '</g>' +
        wheel(116,134,26) + wheel(250,134,26) + wheel(312,134,26) +
        '</svg>'
    },
    {
      id:"truck", name:"卡車", tint:"#2F7FD1", track:"road", sound:truckHorn,
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
      svg: '<svg viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="輕軌">' +
        '<g class="body">' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="#FBFDFD"/>' +
        '<path d="M12 112 Q12 36 56 34 L398 34 Q426 34 426 62 L426 112 Z" fill="none" stroke="#D5DEE4" stroke-width="3"/>' +
        '<path d="M12 96 Q12 44 56 42 L120 42 L120 78 L12 78 Z" fill="#28323B"/>' +
        '<rect x="132" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect x="204" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
        '<rect x="276" y="48" width="60" height="30" rx="5" fill="#28323B"/>' +
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
  var scene = document.getElementById("scene");
  var rider = document.getElementById("rider");
  var grid  = document.getElementById("grid");
  var muteBtn = document.getElementById("mute");
  var current = VEHICLES[0];
  var actTimer = null;

  // 場景上的車和車庫按鈕會同時出現，clipPath 的 id 必須各自不同
  function uniqueIds(html, suffix){
    return html.replace(/mx-drum/g, "mx-drum-" + suffix);
  }

  function show(v, withSound){
    current = v;
    scene.setAttribute("data-track", v.track);
    rider.innerHTML = uniqueIds(v.svg, "scene");
    rider.setAttribute("aria-label", v.name);
    // 讓車子從左邊重新開進來
    rider.style.animation = "none";
    void rider.offsetWidth;
    rider.style.animation = "";
    Array.prototype.forEach.call(grid.children, function(b){
      b.setAttribute("aria-pressed", String(b.dataset.id === v.id));
    });
    if(withSound){ say(v.name); }
  }

  function act(){
    rider.classList.remove("acting");
    void rider.offsetWidth;
    rider.classList.add("acting");
    clearTimeout(actTimer);
    actTimer = setTimeout(function(){ rider.classList.remove("acting"); }, 2200);
    current.sound();
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

  rider.addEventListener("click", act);

  muteBtn.addEventListener("click", function(){
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "開啟聲音" : "靜音");
    if(muted && window.speechSynthesis){ window.speechSynthesis.cancel(); }
  });

  show(VEHICLES[0], false);
})();
