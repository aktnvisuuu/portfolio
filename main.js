(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- formes, filtres texture, grain, curseur (partagés par toutes les pages) ---------- */
  const g = (id, seed1, seed2, base, scale, mat) =>
    `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="${base}" numOctaves="3" seed="${seed1}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="${mat[0]}" numOctaves="2" seed="${seed2}" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${mat[1]} 0 0 0 ${mat[2]}" result="h"/><feComposite in="d" in2="h" operator="in"/></filter>`;
  document.body.insertAdjacentHTML('afterbegin',
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <symbol id="star" viewBox="0 0 100 100"><path d="M50 4 61 38 97 38 68 59 79 94 50 72 21 94 32 59 3 38 39 38Z"/></symbol>
      <symbol id="sparkle" viewBox="0 0 100 100"><path d="M50 0C52 38 62 48 100 50 62 52 52 62 50 100 48 62 38 52 0 50 38 48 48 38 50 0Z"/></symbol>
      ${g('grunge1',2,5,.09,8,[.55,-14,8.4])}${g('grunge2',9,13,.09,9,[.55,-14,8.4])}${g('grunge3',21,34,.09,7,[.55,-14,8.4])}
      ${g('rough1',1,3,.035,6,[.9,-9,6.2])}${g('rough2',7,11,.035,7,[.9,-9,6.2])}${g('rough3',15,19,.035,5,[.9,-9,6.2])}
    </defs></svg>
    <div class="grain" aria-hidden="true"></div>
    <div class="cursor" id="cursor" aria-hidden="true"><svg viewBox="0 0 100 100"><use href="#sparkle"/></svg></div>`);

  /* ---------- shader photocopie + éclats ---------- */
  const cv = document.getElementById('fluid');
  const mouse = {x:.72, y:.6, tx:.72, ty:.6};
  const gl = cv && cv.getContext('webgl', {antialias:false});
  if (gl) {
    const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=R*p*2.;a*=.5;}return v;}
float flare(vec2 d,float s){
 vec2 a=abs(d)/s;
 float core=exp(-length(d)/s*22.);
 float x=exp(-a.y*110.)*exp(-a.x*4.5);
 float y=exp(-a.x*110.)*exp(-a.y*4.5);
 float halo=exp(-length(d)/s*7.)*.35;
 return core*1.3+(x+y)+halo;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 float asp=r.x/r.y;
 vec2 mm=(m-.5)*vec2(asp,1.);
 float ts=floor(t*8.)/8.;
 vec2 p=uv*vec2(2.4,1.7)+vec2(0.,t*.018);
 float f=fbm(p+fbm(p*1.4-t*.02)*1.3);
 float c=.05+smoothstep(.48,.78,f)*.5;
 float rows=smoothstep(.5,.0,abs(fract(uv.y*2.3+f*.4)-.5))*.12;
 c+=rows*smoothstep(.4,.7,f);
 for(int i=0;i<9;i++){
  float fi=float(i);
  vec2 pos=vec2((h(vec2(fi,1.3))-.5)*asp,h(vec2(fi,7.1))-.5)*.92;
  pos+=.04*vec2(sin(t*.1+fi),cos(t*.08+fi*1.7));
  float s=.45+h(vec2(fi,3.7))*.9;
  float tw=.6+.4*sin(t*(.25+.2*h(vec2(fi,5.9)))+fi*2.3);
  c+=flare(uv-pos,s)*tw*.6;
 }
 float sm=h(vec2(floor(gl_FragCoord.y/2.),floor(t*1.5)));
 c+=step(.988,sm)*.14*smoothstep(.0,.6,c+.2);
 float sc=step(.997,h(vec2(floor(gl_FragCoord.x),floor(t*1.2))));
 c+=sc*.18;
 c*=smoothstep(1.35,.2,length(uv*vec2(.72,1.)));
 float g=h(gl_FragCoord.xy+fract(ts*.913)*vec2(91.7,47.3)*13.);
 float g2=h(gl_FragCoord.xy*1.31+fract(ts*.57)*71.);
 float v=c+(g-.5)*.5;
 v=mix(v,step(g2,c*1.1),.5);
 v=max(v,step(.9986,h(floor(gl_FragCoord.xy/2.)+floor(t*.8))));
 gl_FragColor=vec4(vec3(clamp(v,0.,1.)),1.);
}`;
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const pr=gl.createProgram();
    gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(pr);gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const uR=gl.getUniformLocation(pr,'r'),uT=gl.getUniformLocation(pr,'t'),uM=gl.getUniformLocation(pr,'m');
    const resize=()=>{cv.width=Math.max(1,cv.clientWidth*.5|0);cv.height=Math.max(1,cv.clientHeight*.5|0);gl.viewport(0,0,cv.width,cv.height);};
    resize();addEventListener('resize',resize);
    let visible=true;
    new IntersectionObserver(e=>{visible=e[0].isIntersecting;}).observe(cv);
    const t0=performance.now();
    const draw=(now)=>{
      mouse.x+=(mouse.tx-mouse.x)*.06;mouse.y+=(mouse.ty-mouse.y)*.06;
      gl.uniform2f(uR,cv.width,cv.height);
      gl.uniform1f(uT,reduce?14:(now-t0)/1000);
      gl.uniform2f(uM,mouse.x,mouse.y);
      gl.drawArrays(gl.TRIANGLES,0,3);
    };
    if(reduce){draw(0);addEventListener('resize',()=>draw(0));}
    else{let last=0;const loop=(now)=>{if(visible&&now-last>40){draw(now);last=now;}requestAnimationFrame(loop);};requestAnimationFrame(loop);}
  }

  /* ---------- pointeur + curseur ---------- */
  const cur=document.getElementById('cursor');
  addEventListener('pointermove',e=>{
    if(cv){const rc=cv.getBoundingClientRect();mouse.tx=(e.clientX-rc.left)/rc.width;mouse.ty=1-(e.clientY-rc.top)/rc.height;}
    cur.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;
  },{passive:true});
  document.addEventListener('pointerover',e=>{cur.classList.toggle('big',!!e.target.closest('a,button'));});

  /* ---------- anneaux (accueil) ---------- */
  const svg=document.getElementById('rings');
  if(svg){
    const NS='http://www.w3.org/2000/svg';
    for(let i=0;i<14;i++){
      const e=document.createElementNS(NS,'ellipse');
      e.setAttribute('cx',100);e.setAttribute('cy',100);
      e.setAttribute('rx',92-i*5.5);e.setAttribute('ry',(92-i*5.5)*.42);
      e.setAttribute('class','ring');svg.appendChild(e);
    }
    const rings=[...svg.children];
    if(!reduce){const spin=(now)=>{rings.forEach((r,i)=>{r.style.transform=`rotate(${(now/160+i*13)%360}deg)`;});requestAnimationFrame(spin);};requestAnimationFrame(spin);}
    else rings.forEach((r,i)=>r.style.transform=`rotate(${i*13}deg)`);
  }

  /* ---------- texture qui vibre ---------- */
  if(!reduce){let b=1;setInterval(()=>{b=b%3+1;root.dataset.b=b;},420);}

  /* ---------- copier l'email ---------- */
  const btn=document.getElementById('copy'),mail=document.getElementById('email');
  if(btn&&mail){
    btn.addEventListener('click',()=>{
      const reset=()=>setTimeout(()=>btn.textContent='Copier',1800);
      const fallback=()=>{const s=getSelection(),rg=document.createRange();rg.selectNodeContents(mail);s.removeAllRanges();s.addRange(rg);btn.textContent='Sélectionné';reset();};
      try{navigator.clipboard.writeText(mail.textContent).then(()=>{btn.textContent='Copié';reset();},fallback);}catch(e){fallback();}
    });
  }

  /* ---------- photo : filtres par série ---------- */
  const shots=[...document.querySelectorAll('.shot')];
  const series=[...document.querySelectorAll('.series')];
  const count=document.getElementById('count');
  document.querySelectorAll('[data-filter]').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));
      const f=b.dataset.filter;let n=0;
      series.forEach(s=>{const on=f==='tout'||s.dataset.cat===f;s.hidden=!on;if(on)n+=s.querySelectorAll('.shot').length;});
      if(count)count.textContent=`${n} photo${n>1?'s':''}`;
      dispatchEvent(new Event('resize'));
    });
  });

  /* ---------- photo : carrousels ---------- */
  document.querySelectorAll('.series').forEach(sec=>{
    const car=sec.querySelector('.carousel'),nav=sec.querySelector('.car-nav');
    if(!car||!nav)return;
    const prev=nav.querySelector('.car-prev'),next=nav.querySelector('.car-next');
    const upd=()=>{const max=car.scrollWidth-car.clientWidth;nav.hidden=max<=4;prev.disabled=car.scrollLeft<=4;next.disabled=car.scrollLeft>=max-4;};
    const go=d=>car.scrollBy({left:d*car.clientWidth,behavior:reduce?'auto':'smooth'});
    prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
    car.addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();
  });

  /* ---------- photo : visionneuse ---------- */
  const lb=document.getElementById('lb');
  if(lb&&shots.length){
    const fig=document.getElementById('lbFig');
    let idx=0,opener=null;
    const visibleShots=()=>shots.filter(s=>!s.closest('.series')?.hidden);
    const show=(s)=>{
      fig.innerHTML='';
      const ph=s.querySelector('.ph').cloneNode(true);
      const im=ph.querySelector('img');
      if(im){im.loading='eager';if(im.dataset.full)im.src=im.dataset.full;}
      fig.style.setProperty('--arn',ph.style.getPropertyValue('--arn'));
      fig.append(ph,s.querySelector('.cap').cloneNode(true));
    };
    const open=(s)=>{opener=s;idx=visibleShots().indexOf(s);show(s);lb.hidden=false;document.body.style.overflow='hidden';document.getElementById('lbClose').focus();};
    const close=()=>{lb.hidden=true;document.body.style.overflow='';if(opener)opener.focus();};
    const step=(d)=>{const v=visibleShots();idx=(idx+d+v.length)%v.length;show(v[idx]);};
    shots.forEach(s=>s.addEventListener('click',()=>open(s)));
    document.getElementById('lbClose').addEventListener('click',close);
    document.getElementById('lbPrev').addEventListener('click',()=>step(-1));
    document.getElementById('lbNext').addEventListener('click',()=>step(1));
    lb.addEventListener('click',e=>{if(e.target===lb)close();});
    addEventListener('keydown',e=>{
      if(lb.hidden)return;
      if(e.key==='Escape')close();
      if(e.key==='ArrowLeft')step(-1);
      if(e.key==='ArrowRight')step(1);
    });
  }

  /* ---------- vidéo / montage : menu par type ---------- */
  const kindBtns=[...document.querySelectorAll('[data-kind-filter]')];
  const kindSecs=[...document.querySelectorAll('.kind-sec')];
  kindBtns.forEach(b=>b.addEventListener('click',()=>{
    kindBtns.forEach(x=>x.setAttribute('aria-pressed',x===b));
    const k=b.dataset.kindFilter;
    kindSecs.forEach(s=>{s.hidden=!(k==='tout'||s.dataset.kind===k);});
  }));
  /* miniatures YouTube : si l'image ne charge pas, on garde le titre en fond */
  document.querySelectorAll('.yt-thumb').forEach(im=>{
    const off=()=>{im.style.display='none';};
    if(im.complete&&im.naturalWidth===0)off();
    im.addEventListener('error',off);
  });

  /* ---------- vidéo : ouvrir une pile ---------- */
  const vm=document.getElementById('vmodal');
  if(vm){
    const body=document.getElementById('vmBody');let opener=null;
    const close=()=>{vm.hidden=true;document.body.style.overflow='';body.innerHTML='';if(opener)opener.focus();};
    document.querySelectorAll('.stack').forEach(st=>st.addEventListener('click',()=>{
      opener=st;body.innerHTML='';body.appendChild(st.querySelector('.stack-tpl').content.cloneNode(true));
      vm.hidden=false;vm.scrollTop=0;document.body.style.overflow='hidden';document.getElementById('vmClose').focus();
    }));
    document.getElementById('vmClose').addEventListener('click',close);
    vm.addEventListener('click',e=>{if(e.target===vm)close();});
    addEventListener('keydown',e=>{if(!vm.hidden&&e.key==='Escape')close();});
  }

  /* ---------- montage : timecode de la timeline ---------- */
  const tc=document.getElementById('tc');
  if(tc){
    const SEQ=92,CYCLE=30000,FPS=25;
    const fmt=(sec)=>{const f=Math.floor((sec%1)*FPS),s=Math.floor(sec)%60,m=Math.floor(sec/60);return `00:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;};
    if(reduce)tc.textContent=fmt(0);
    else{const tick=(now)=>{tc.textContent=fmt((now%CYCLE)/CYCLE*SEQ);requestAnimationFrame(tick);};requestAnimationFrame(tick);}
  }
})();
