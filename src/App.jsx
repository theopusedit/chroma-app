import { useState, useMemo, useEffect } from "react";
import { CONFIG, THEME } from "./config";
import supabase, {
  signUp, signIn, signOut, getUser, getProfile,
  saveRecord, getMyRecords, getPublicFeed,
  getMyLists, createList, saveListAssignment,
} from './supabase.js';
import { searchMusic, getAlbumTracks, getStreamingLinks, getChart, getNewReleases, getRecommendations, getTrackWithFeatures } from './music.js';

// ── 색상 단축키 ───────────────────────────────────────────────
const C = CONFIG.colors;

// ── 그라디언트 커버 색상 ──────────────────────────────────────
const GR = [
  ["#3B1F6B","#5B2D8E"],["#1A1A4E","#2D2D8B"],["#1F3A1F","#2D6B2D"],
  ["#3A1A1A","#6B2D2D"],["#1A2A3A","#2D4A6B"],["#2A1A3A","#4A2D6B"],
  ["#1A3A2A","#2D6B4A"],["#3A2A1A","#6B4A2D"],
];
const bg = (g) => `linear-gradient(145deg,${GR[g%8][0]},${GR[g%8][1]})`;

// ── 샘플 데이터 (Spotify API 연결 전까지 사용) ────────────────
const TRACKS = [
  {id:1,t:"Supermassive Black Hole",ar:"Muse",al:"Black Holes and Revelations",yr:2006,g:0,rec:3241,rt:4.3,genre:"Alternative Rock",bpm:128,dur:"3:32",type:"album_track",alid:1},
  {id:2,t:"밤편지",ar:"아이유",al:"Palette",yr:2017,g:1,rec:5102,rt:4.8,genre:"K-Pop / Indie Pop",bpm:76,dur:"4:05",type:"album_track",alid:2},
  {id:3,t:"Iguazu",ar:"Gustavo Santaolalla",al:"Brokeback Mountain OST",yr:2005,g:2,rec:1823,rt:4.9,genre:"Instrumental / Folk",bpm:60,dur:"3:47",type:"ost",alid:3},
  {id:4,t:"Blinding Lights",ar:"The Weeknd",al:"After Hours",yr:2020,g:3,rec:7823,rt:4.5,genre:"Synth-pop / R&B",bpm:171,dur:"3:22",type:"album_track",alid:4},
  {id:5,t:"가을 아침",ar:"아이유",al:"Flower Bookmark",yr:2016,g:4,rec:4201,rt:4.7,genre:"K-Pop / Folk Pop",bpm:88,dur:"3:27",type:"single",alid:2},
  {id:6,t:"Bohemian Rhapsody",ar:"Queen",al:"A Night at the Opera",yr:1975,g:5,rec:9123,rt:4.9,genre:"Prog Rock / Art Rock",bpm:72,dur:"5:55",type:"album_track",alid:5},
  {id:7,t:"좋은 날",ar:"아이유",al:"Real+",yr:2010,g:6,rec:6543,rt:4.6,genre:"K-Pop / Ballad",bpm:140,dur:"3:55",type:"single",alid:2},
  {id:8,t:"Hotel California",ar:"Eagles",al:"Hotel California",yr:1977,g:7,rec:5432,rt:4.8,genre:"Classic Rock",bpm:75,dur:"6:30",type:"album_track",alid:6},
];

const ALBUMS = [
  {id:1,t:"Black Holes and Revelations",ar:"Muse",yr:2006,g:0,rec:1823,rt:4.4,altype:"정규 5집",genre:"Alternative Rock",tracks:11,dur:"46:55",label:"Warner Bros."},
  {id:2,t:"Palette",ar:"아이유",yr:2017,g:1,rec:2341,rt:4.8,altype:"정규 4집",genre:"K-Pop / Indie Pop",tracks:10,dur:"38:12",label:"LOEN Entertainment"},
  {id:3,t:"Brokeback Mountain OST",ar:"Gustavo Santaolalla",yr:2005,g:2,rec:987,rt:4.9,altype:"OST",genre:"Instrumental",tracks:14,dur:"38:56",label:"Verve Records"},
  {id:4,t:"After Hours",ar:"The Weeknd",yr:2020,g:3,rec:3102,rt:4.6,altype:"정규 4집",genre:"Synth-pop / R&B",tracks:14,dur:"56:16",label:"Republic Records"},
  {id:5,t:"A Night at the Opera",ar:"Queen",yr:1975,g:5,rec:4201,rt:4.9,altype:"정규 4집",genre:"Prog Rock",tracks:12,dur:"43:08",label:"EMI"},
  {id:6,t:"Hotel California",ar:"Eagles",yr:1977,g:7,rec:5432,rt:4.8,altype:"정규 5집",genre:"Classic Rock",tracks:9,dur:"43:28",label:"Asylum Records"},
];

const INIT_LISTS = [];
const INIT_RECORDS = {};
const INIT_TLISTS = {};

const NOTIFS = [
  {id:1,type:"like",user:"park.music",msg:"님이 회원님의 리뷰에 좋아요를 눌렀어요",sub:"Supermassive Black Hole",time:"5분 전",read:false},
  {id:2,type:"follow",user:"seo.archive",msg:"님이 팔로우를 시작했어요",sub:"",time:"1시간 전",read:false},
  {id:3,type:"record",user:"coldwave_j",msg:"님이 새 곡을 기록했어요",sub:"Bohemian Rhapsody — Queen",time:"3시간 전",read:true},
  {id:4,type:"like",user:"yujin__",msg:"님이 회원님의 리뷰에 좋아요를 눌렀어요",sub:"밤편지",time:"어제",read:true},
];

const FEED_ITEMS = [
  {id:1,user:"coldwave_j",uid:"coldwave",track:"Supermassive Black Hole",artist:"Muse",g:0,rating:5,memo:"트와일라잇 배구씬에서 처음 들었는데 그 이후로 인생 곡이 됨",likes:892,time:"2시간 전"},
  {id:2,user:"park.music",uid:"parkmusic",track:"Bohemian Rhapsody",artist:"Queen",g:5,rating:5,memo:"오페라 파트가 나올 때마다 소름이 돋음",likes:657,time:"4시간 전"},
  {id:3,user:"seo.archive",uid:"seo",track:"밤편지",artist:"아이유",g:1,rating:5,memo:"비 오는 날 혼자 듣기 좋은 곡",likes:423,time:"6시간 전"},
  {id:4,user:"yujin__",uid:"yujin",track:"Iguazu",artist:"Gustavo Santaolalla",g:2,rating:5,memo:"말 없이 그냥 듣고 싶은 날이 있는데",likes:312,time:"어제"},
];

// ── 준비중 모달 ───────────────────────────────────────────────
function ComingSoonModal({t, title, message, sub, onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={onClose}>
      <div style={{background:t.sf,borderRadius:24,padding:"32px 24px",width:"100%",
        maxWidth:340,textAlign:"center",border:`1px solid ${t.bd}`}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:48,marginBottom:16}}>🎵</div>
        <div style={{fontSize:20,fontWeight:800,color:t.tx,marginBottom:8,letterSpacing:-.3}}>
          {title || "준비 중이에요"}
        </div>
        <div style={{fontSize:14,color:t.tx2,lineHeight:1.7,marginBottom:24}}>
          {message || CONFIG.comingSoon.payment}
        </div>
        {sub && <div style={{fontSize:12,color:t.tx3,marginBottom:20}}>{sub}</div>}
        <div style={{background:C.primary,color:"#fff",padding:"14px",borderRadius:12,
          fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={onClose}>
          확인
        </div>
      </div>
    </div>
  );
}

// ── 로그인 화면 ───────────────────────────────────────────────
function LoginScreen({t, dark, setDark, onLogin, onBack}) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    setError("");
    if (!email) { setError("이메일을 입력해주세요"); return; }
    if (!isValidEmail(email)) { setError("올바른 이메일 형식으로 입력해주세요 (예: hello@gmail.com)"); return; }
    if (mode !== "forgot" && !pw) { setError("비밀번호를 입력해주세요"); return; }
    if (mode === "signup" && !name) { setError("닉네임을 입력해주세요"); return; }
    if (mode === "signup" && name.length < 2) { setError("닉네임은 2자 이상 입력해주세요"); return; }
    if (mode === "signup" && pw.length < 6) { setError("비밀번호는 6자 이상이어야 해요"); return; }
    setLoading(true);
    try {
      if (mode === "forgot") { setMode("login"); alert("재설정 링크를 이메일로 보냈어요!"); setLoading(false); return; }
      if (mode === "signup") { await signUp(email, pw, name); onLogin(); }
      else { await signIn(email, pw); onLogin(); }
    } catch(e) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) setError("이메일 또는 비밀번호가 틀렸어요");
      else if (msg.includes("already registered") || msg.includes("already exists")) setError("이미 가입된 이메일이에요. 로그인을 시도해보세요");
      else if (msg.includes("weak password")) setError("비밀번호는 6자 이상, 영문+숫자 조합을 추천해요");
      else if (msg.includes("network") || msg.includes("fetch")) setError("네트워크 오류예요. 인터넷 연결을 확인해주세요");
      else setError("오류: " + (e.message || "다시 시도해주세요"));
    }
    setLoading(false);
  };

  if (mode === "forgot") {
    return (
      <div style={{minHeight:"100vh",background:t.bg,padding:"52px 24px 40px"}}>
        <div style={{marginBottom:32}}><IconBtn icon="‹" t={t} onClick={()=>setMode("login")}/></div>
        <div style={{fontSize:28,fontWeight:800,color:t.tx,letterSpacing:-.5,marginBottom:8}}>비밀번호 찾기</div>
        <div style={{fontSize:14,color:t.tx2,marginBottom:32,lineHeight:1.6}}>가입한 이메일로 재설정 링크를 보내드려요</div>
        <input style={inputStyle(t)} placeholder="이메일" value={email} onChange={e=>setEmail(e.target.value)}/>
        <div style={{background:C.primary,color:"#fff",padding:"16px",borderRadius:14,
          textAlign:"center",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:16}}
          onClick={()=>{ setMode("login"); }}>
          재설정 링크 보내기
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:t.tx2,cursor:"pointer"}}
          onClick={()=>setMode("login")}>로그인으로 돌아가기</div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:t.bg,padding:"52px 24px 40px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:48}}>
        <IconBtn icon="‹" t={t} onClick={onBack}/>
        <IconBtn icon={dark?"☀":"☾"} t={t} onClick={()=>setDark(!dark)}/>
      </div>

      <div style={{fontSize:32,fontWeight:800,color:t.tx,letterSpacing:-.8,marginBottom:4}}>
        {CONFIG.service.name}
      </div>
      <div style={{fontSize:15,color:t.tx2,marginBottom:40}}>
        {mode==="login" ? "다시 만나서 반가워요" : "음악 기억을 시작해요"}
      </div>

      {/* 소셜 로그인 — 준비중 */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {[{icon:"🇰",label:"카카오로 계속하기",bg:"#FEE500",color:"#000"},
          {icon:"G",label:"Google로 계속하기",bg:t.sf,color:t.tx,border:true}].map((s,i)=>(
          <div key={i} style={{background:s.bg,color:s.color,padding:"14px",borderRadius:14,
            textAlign:"center",fontSize:14,fontWeight:600,cursor:"pointer",
            border:s.border?`1px solid ${t.bd}`:"none",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
            onClick={()=>{}}>
            <span style={{fontSize:16}}>{s.icon}</span>{s.label}
            <span style={{fontSize:10,color:s.border?t.tx3:"rgba(0,0,0,0.4)",marginLeft:4}}>(준비중)</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{flex:1,height:1,background:t.bd}}/>
        <span style={{fontSize:12,color:t.tx3}}>또는 이메일로</span>
        <div style={{flex:1,height:1,background:t.bd}}/>
      </div>

      {/* 이메일 폼 */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {mode==="signup"&&<input style={inputStyle(t)} placeholder="닉네임" value={name} onChange={e=>setName(e.target.value)}/>}
        <input style={inputStyle(t)} placeholder="이메일" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={inputStyle(t)} placeholder="비밀번호" type="password" value={pw} onChange={e=>setPw(e.target.value)}/>
      </div>

      {error && (
        <div style={{marginTop:12,padding:"10px 14px",background:`${C.red}15`,borderRadius:10,
          fontSize:13,color:C.red,border:`1px solid ${C.red}25`}}>
          ⚠ {error}
        </div>
      )}

      {mode==="login"&&(
        <div style={{textAlign:"right",marginTop:10,marginBottom:4}}>
          <span style={{fontSize:13,color:C.primary,cursor:"pointer"}}
            onClick={()=>setMode("forgot")}>비밀번호 찾기</span>
        </div>
      )}

      <div style={{background:loading?t.sf:C.primary,color:loading?t.tx2:"#fff",
        padding:"16px",borderRadius:14,textAlign:"center",fontSize:15,fontWeight:700,
        cursor:loading?"not-allowed":"pointer",marginTop:20,transition:"all 0.2s"}}
        onClick={loading?null:handleSubmit}>
        {loading ? "잠시만요..." : mode==="login" ? "로그인" : "가입하기"}
      </div>

      <div style={{textAlign:"center",marginTop:20,fontSize:13,color:t.tx2}}>
        {mode==="login" ? (
          <>아직 계정이 없으신가요? <span style={{color:C.primary,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("signup");setError("")}}>회원가입</span></>
        ) : (
          <>이미 계정이 있으신가요? <span style={{color:C.primary,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("login");setError("")}}>로그인</span></>
        )}
      </div>

      <div style={{marginTop:32,fontSize:11,color:t.tx3,textAlign:"center",lineHeight:1.8}}>
        가입 시 <span style={{textDecoration:"underline",cursor:"pointer"}}>이용약관</span> 및 <span style={{textDecoration:"underline",cursor:"pointer"}}>개인정보처리방침</span>에 동의하게 됩니다
      </div>
    </div>
  );
}

// ── 공통 input 스타일 ─────────────────────────────────────────
const inputStyle = (t) => ({
  width:"100%",
  background:t.sf,
  border:`1px solid ${t.bd}`,
  borderRadius:14,
  padding:"14px 16px",
  color:t.tx,
  fontSize:15,
  fontFamily:"inherit",
});

// ── 마이크로 컴포넌트 ─────────────────────────────────────────
const Cover = ({g=0,size=56,r=10,img=null}) => (
  <div style={{width:size,height:size,borderRadius:r,flexShrink:0,
    background:img?"none":bg(g),
    backgroundImage:img?`url(${img})`:"none",
    backgroundSize:"cover",backgroundPosition:"center",
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:size*.26,color:"rgba(255,255,255,0.25)",overflow:"hidden"}}>
    {!img && "♪"}
  </div>
);

const Stars = ({n=4,s=11}) => (
  <span style={{color:C.gold,fontSize:s,letterSpacing:.5,lineHeight:1}}>
    {"★".repeat(Math.floor(n))}{"☆".repeat(5-Math.floor(n))}
  </span>
);

const Sec = ({title,t,children,action,onAction}) => (
  <div style={{marginBottom:36}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 20px",marginBottom:14}}>
      <span style={{fontSize:20,fontWeight:700,letterSpacing:-.4,color:t.tx}}>{title}</span>
      {action&&<span style={{fontSize:14,color:t.ac,cursor:"pointer",fontWeight:500}} onClick={onAction}>{action}</span>}
    </div>
    {children}
  </div>
);

const HScroll = ({children}) => (
  <div style={{display:"flex",gap:14,padding:"0 20px",overflowX:"auto",scrollbarWidth:"none"}}>{children}</div>
);

const TCard = ({item,t,onClick,w=140,recorded=false}) => (
  <div style={{flexShrink:0,width:w,cursor:"pointer"}} onClick={onClick}>
    <div style={{width:w,height:w,borderRadius:14,position:"relative",overflow:"hidden",
      background:item?.coverUrl?"#111":bg((item?.g||0)),
      backgroundImage:item?.coverUrl?`url(${item.coverUrl})`:"none",
      backgroundSize:"cover",backgroundPosition:"center",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:w*.26,color:"rgba(255,255,255,0.2)"}}>
      {!item?.coverUrl&&"♪"}
      {recorded&&<div style={{position:"absolute",top:7,right:7,width:20,height:20,
        borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",
        justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700}}>✓</div>}
    </div>
    <div style={{marginTop:8,fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{item?.t||""}</div>
    <div style={{fontSize:12,color:t.tx2,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{item?.ar||""}</div>
  </div>
);

const RowItem = ({tr,rank,t,onClick,recorded}) => (
  <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",cursor:"pointer"}} onClick={onClick}>
    {rank!=null&&<span style={{fontSize:15,fontWeight:700,color:rank<3?C.primary:t.tx3,width:22,flexShrink:0,textAlign:"right"}}>{rank+1}</span>}
    <Cover g={tr.g} size={46} r={9}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx}}>{tr.t}</div>
      <div style={{fontSize:12,color:t.tx2,marginTop:1}}>{tr.ar}</div>
    </div>
    <div style={{flexShrink:0,textAlign:"right"}}>
      <Stars n={tr.rt} s={10}/>
      {recorded&&<div style={{fontSize:10,color:C.primary,marginTop:1,fontWeight:600}}>기록됨</div>}
    </div>
  </div>
);

const IconBtn = ({icon,t,onClick,badge=false}) => (
  <div onClick={onClick} style={{width:36,height:36,borderRadius:"50%",
    background:t.sf,display:"flex",alignItems:"center",justifyContent:"center",
    cursor:"pointer",position:"relative",flexShrink:0}}>
    <span style={{fontSize:17}}>{icon}</span>
    {badge&&<div style={{position:"absolute",top:5,right:5,width:8,height:8,
      borderRadius:"50%",background:C.red,border:`2px solid ${t.bg}`}}/>}
  </div>
);

const Toggle = ({on,onToggle,t}) => (
  <div style={{width:48,height:28,background:on?C.primary:t.sf3,borderRadius:14,
    position:"relative",cursor:"pointer",transition:"background 0.25s",flexShrink:0}}
    onClick={onToggle}>
    <div style={{width:22,height:22,background:"#fff",borderRadius:"50%",
      position:"absolute",top:3,left:on?23:3,transition:"left 0.25s",
      boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
  </div>
);

// ── LANDING ───────────────────────────────────────────────────
function LandingScreen({t,dark,setDark,onLogin,onSignup}){
  return(
    <div style={{minHeight:"100vh",background:t.bg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"16px 24px",position:"sticky",top:0,
        background:`${t.bg}f0`,backdropFilter:"blur(20px)",
        zIndex:10,borderBottom:`1px solid ${t.bd}`}}>
        <span style={{fontSize:20,fontWeight:800,letterSpacing:-.6,color:t.tx}}>{CONFIG.service.name}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <IconBtn icon={dark?"☀":"☾"} t={t} onClick={()=>setDark(!dark)}/>
          <div style={{fontSize:13,fontWeight:600,color:"#fff",cursor:"pointer",
            padding:"8px 18px",borderRadius:20,background:C.primary}}
            onClick={onLogin}>로그인</div>
        </div>
      </div>

      <div style={{padding:"64px 24px 56px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12,
          letterSpacing:.15,textTransform:"uppercase",color:C.primary,
          background:`${C.primary}12`,padding:"6px 16px",borderRadius:20,
          marginBottom:24,fontWeight:700}}>
          {CONFIG.landing.badge}
        </div>
        <h1 style={{fontSize:50,fontWeight:800,lineHeight:1.06,letterSpacing:-2.5,color:t.tx,marginBottom:20}}>
          {CONFIG.landing.heroTitle[0]}<br/>{CONFIG.landing.heroTitle[1]}<br/>
          <span style={{background:`linear-gradient(135deg,${C.primary},#A78BFA)`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {CONFIG.landing.heroHighlight}
          </span>
        </h1>
        <p style={{fontSize:16,color:t.tx2,lineHeight:1.75,maxWidth:280,margin:"0 auto 40px"}}>
          {CONFIG.service.description.split("\n").map((l,i)=><span key={i}>{l}<br/></span>)}
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}>
          <div style={{background:C.primary,color:"#fff",padding:"16px",borderRadius:14,
            fontSize:15,fontWeight:700,cursor:"pointer",width:"100%",maxWidth:300,textAlign:"center"}}
            onClick={onSignup}>{CONFIG.landing.ctaPrimary}</div>
          <div style={{background:t.sf,color:t.tx,border:`1px solid ${t.bd}`,
            padding:"15px",borderRadius:14,fontSize:15,cursor:"pointer",
            width:"100%",maxWidth:300,textAlign:"center"}}
            onClick={onLogin}>{CONFIG.landing.ctaSecondary}</div>
          <span style={{fontSize:12,color:t.tx3,marginTop:2}}>{CONFIG.landing.ctaNote}</span>
        </div>
      </div>

      {/* 미리보기 */}
      <div style={{margin:"0 20px 56px",background:t.sf,borderRadius:20,
        border:`1px solid ${t.bd}`,overflow:"hidden",
        boxShadow:dark?"0 32px 80px rgba(0,0,0,0.5)":"0 16px 48px rgba(0,0,0,0.06)"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${t.bd}`}}>
          <span style={{fontSize:11,color:t.tx3,letterSpacing:.12,textTransform:"uppercase",fontWeight:600}}>최근 기록</span>
        </div>
        {[{g:1,t:"밤편지",ar:"아이유",n:5,m:"처음 들었을 때 새벽 4시였는데..."},{g:3,t:"Blinding Lights",ar:"The Weeknd",n:4.5,m:""},{g:0,t:"Supermassive Black Hole",ar:"Muse",n:5,m:"트와일라잇 배구씬에서"}].map((x,i)=>(
          <div key={i} style={{padding:"12px 16px",borderBottom:i<2?`1px solid ${t.bd}`:"none",display:"flex",gap:12,alignItems:"center"}}>
            <Cover g={x.g} size={42} r={8}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:t.tx}}>{x.t}</div>
              <div style={{fontSize:11,color:t.tx2}}>{x.ar}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <Stars n={x.n} s={11}/>
              {x.m&&<div style={{fontSize:10,color:t.tx3,maxWidth:90,textAlign:"right",fontStyle:"italic",marginTop:2,lineHeight:1.4,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{x.m}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* 통계 */}
      <div style={{background:t.sf,margin:"0 20px 56px",borderRadius:20,padding:"28px",border:`1px solid ${t.bd}`}}>
        <div style={{fontSize:15,fontWeight:700,textAlign:"center",color:t.tx,marginBottom:22}}>지금 {CONFIG.service.name}에서</div>
        <div style={{display:"flex",justifyContent:"space-around"}}>
          {CONFIG.landing.stats.map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,color:C.primary,letterSpacing:-.5}}>{s.number}</div>
              <div style={{fontSize:11,color:t.tx2,marginTop:5}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 기능 소개 */}
      <div style={{padding:"0 20px",marginBottom:56}}>
        <div style={{fontSize:26,fontWeight:800,letterSpacing:-.8,color:t.tx,marginBottom:24,lineHeight:1.2}}>음악을 기억하는<br/>새로운 방법</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {CONFIG.landing.features.map((f,i)=>(
            <div key={i} style={{background:t.sf,border:`1px solid ${t.bd}`,borderRadius:18,padding:"20px 16px"}}>
              <div style={{fontSize:26,marginBottom:10,color:C.primary}}>{f.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:t.tx,marginBottom:6}}>{f.title}</div>
              <div style={{fontSize:12,color:t.tx2,lineHeight:1.55}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro 배너 */}
      <div style={{margin:"0 20px 56px",background:dark?"#0D0D1A":"#F3EEFF",
        border:`1px solid ${C.primary}30`,borderRadius:20,padding:"28px 24px"}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:.15,color:C.primary,fontWeight:700,marginBottom:8}}>✦ Pro 멤버십</div>
        <div style={{fontSize:22,fontWeight:800,letterSpacing:-.5,color:t.tx,marginBottom:10,lineHeight:1.2}}>무제한으로<br/>기록하세요</div>
        <div style={{fontSize:13,color:t.tx2,lineHeight:1.6,marginBottom:20}}>
          {CONFIG.pricing.proPlanFeatures.join(" · ")}
        </div>
        <div style={{fontSize:24,fontWeight:800,color:t.tx,marginBottom:3,letterSpacing:-.5}}>{CONFIG.pricing.monthly}</div>
        <div style={{fontSize:12,color:t.tx2,marginBottom:20}}>연간 결제 시 {CONFIG.pricing.yearly} ({CONFIG.pricing.yearlySaving})</div>
        <div style={{background:C.primary,color:"#fff",padding:"14px",borderRadius:12,
          fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center"}} onClick={onSignup}>
          Pro 시작하기 →
        </div>
      </div>

      <div style={{borderTop:`1px solid ${t.bd}`,padding:"24px",textAlign:"center"}}>
        <div style={{fontSize:13,color:t.tx3,lineHeight:2}}>
          {CONFIG.service.copyright} · <span style={{cursor:"pointer"}} onClick={()=>window.open(CONFIG.links.terms)}>이용약관</span> · <span style={{cursor:"pointer"}} onClick={()=>window.open(CONFIG.links.privacy)}>개인정보처리방침</span>
        </div>
      </div>
    </div>
  );
}

// ── 알림 패널 ─────────────────────────────────────────────────
function NotifPanel({t,onClose}){
  const icons={like:"♥",follow:"◎",record:"♪"};
  return(
    <div style={{position:"fixed",inset:0,zIndex:200}} onClick={onClose}>
      <div style={{position:"absolute",top:90,right:16,left:16,
        background:t.sf,borderRadius:20,border:`1px solid ${t.bd}`,
        boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden",maxHeight:"60vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${t.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:17,fontWeight:700,color:t.tx}}>알림</span>
          <span style={{fontSize:13,color:C.primary,cursor:"pointer"}}>전체 읽음</span>
        </div>
        {NOTIFS.map(n=>(
          <div key={n.id} style={{display:"flex",gap:12,padding:"14px 20px",
            background:n.read?"transparent":`${C.primary}08`,borderBottom:`1px solid ${t.bd}`}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:n.read?t.sf2:`${C.primary}20`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,color:C.primary}}>
              {icons[n.type]}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:t.tx,lineHeight:1.45}}>
                <span style={{fontWeight:700}}>{n.user}</span>{n.msg}
              </div>
              {n.sub&&<div style={{fontSize:12,color:t.tx2,marginTop:3}}>{n.sub}</div>}
              <div style={{fontSize:11,color:t.tx3,marginTop:4}}>{n.time}</div>
            </div>
            {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:C.primary,marginTop:6,flexShrink:0}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MORE SHEET ────────────────────────────────────────────────
function MoreSheet({t,onClose,track,onListModal}){
  const items=[
    {icon:"↑",label:"공유하기",action:()=>{
      const q=encodeURIComponent(`${track?.t||''} ${track?.ar||''}`);
      navigator.clipboard?.writeText(`https://music.apple.com/kr/search?term=${q}`).then(()=>alert("Apple Music 링크가 복사됐어요!")).catch(()=>{});
      onClose();
    }},
    {icon:"◈",label:"리스트에 담기",action:()=>{onClose();setTimeout(()=>{if(onListModal)onListModal(track);},100);}},
    {icon:"◎",label:"아티스트 검색",action:()=>{window.open(`https://music.apple.com/kr/search?term=${encodeURIComponent(track?.ar||'')}`,'_blank');onClose();}},
    {icon:"♪",label:"유튜브에서 검색",action:()=>{window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${track?.t||''} ${track?.ar||''}`)}`, '_blank');onClose();}},
    {icon:"⚑",label:"신고하기",danger:true,action:()=>{alert("신고가 접수됐어요.");onClose();}},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:t.sf,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,paddingBottom:40}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:t.bd,borderRadius:2,margin:"12px auto 16px"}}/>
        {track&&(
          <div style={{display:"flex",gap:12,padding:"12px 20px 16px",borderBottom:`1px solid ${t.bd}`,marginBottom:8}}>
            {track.coverUrl
              ?<div style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0}}><img src={track.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
              :<Cover g={track.g||0} size={44} r={8}/>}
            <div>
              <div style={{fontSize:14,fontWeight:700,color:t.tx}}>{track.t}</div>
              <div style={{fontSize:12,color:t.tx2,marginTop:2}}>{track.ar}</div>
            </div>
          </div>
        )}
        {items.map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 20px",cursor:"pointer"}} onClick={item.action}>
            <div style={{width:36,height:36,borderRadius:10,background:item.danger?`${C.red}15`:t.sf2,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:item.danger?C.red:t.tx}}>
              {item.icon}
            </div>
            <span style={{fontSize:16,color:item.danger?C.red:t.tx,fontWeight:400}}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────
function HomeScreen({t,dark,setDark,onTrack,onAlbum,onSub,records,onNotif,hasNotif,onSeeAll}){
  const [chart,setChart]=useState("global");
  const [era,setEra]=useState("20s");
  const [trending,setTrending]=useState([]);
  const [newAlbums,setNewAlbums]=useState([]);
  const [chartTracks,setChartTracks]=useState([]);
  const [eraTracks,setEraTracks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [todayPick,setTodayPick]=useState(null);

  const chartLabels={"global":"🌍 전체","kr":"🇰🇷 한국","pop":"팝","kpop":"K-Pop","indie":"인디"};

  useEffect(()=>{
    Promise.all([
      getChart("global", 10),
      getNewReleases(8, "KR"),
    ]).then(([top, releases])=>{
      setTrending(top);
      setChartTracks(top.slice(0, 8));
      if(top[0]) setTodayPick(top[0]);
      setNewAlbums(releases);
      setLoading(false);
    }).catch(()=>setLoading(false));
    // 기본 시대별 (20s)
    getChart("global", 25).then(d=>setEraTracks(d)).catch(()=>{});
  },[]);

  useEffect(()=>{
    getChart(chart, 8).then(d=>setChartTracks(d)).catch(()=>{});
  },[chart]);

  useEffect(()=>{
    const eraQueries={
      "70s":"classic 70s rock disco",
      "80s":"80s pop rock hits",
      "90s":"90s hits grunge alternative",
      "00s":"2000s pop hits",
      "10s":"2010s pop hits",
      "20s":"2020s hits",
    };
    searchMusic(eraQueries[era],"US").then(d=>{
      const sorted=[...d.tracks].sort((a,b)=>(b.yr||0)-(a.yr||0));
      setEraTracks(sorted.slice(0,25));
    }).catch(()=>{});
  },[era]);

  // 시간대별 인사말
  const getGreeting=()=>{
    const h=new Date().getHours();
    if(h>=5&&h<12) return "좋은 아침이에요 ☀️";
    if(h>=12&&h<17) return "좋은 오후예요 🎵";
    if(h>=17&&h<21) return "좋은 저녁이에요 🌙";
    return "늦은 밤이네요 🌃";
  };

  return(
    <div>
      <div style={{padding:"52px 20px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:13,color:t.tx2,marginBottom:3}}>{getGreeting()}</div>
          <div style={{fontSize:30,fontWeight:800,letterSpacing:-.8,color:t.tx}}>{CONFIG.service.name}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <IconBtn icon={dark?"☀":"☾"} t={t} onClick={()=>setDark(!dark)}/>
          <IconBtn icon="🔔" t={t} onClick={onNotif} badge={hasNotif}/>
        </div>
      </div>

      {/* 히어로 배너 */}
      {todayPick&&(
      <div style={{margin:"0 20px 32px",position:"relative",borderRadius:22,overflow:"hidden",cursor:"pointer",minHeight:140}}
        onClick={()=>onTrack(todayPick)}>
        {todayPick.coverUrl
          ?<div style={{position:"absolute",inset:0,backgroundImage:`url(${todayPick.coverUrl})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.45)"}}/>
          :<div style={{position:"absolute",inset:0,background:`linear-gradient(145deg,${GR[1][0]},${GR[5][1]})`}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(0,0,0,0.3),rgba(0,0,0,0.6))"}}/>
        <div style={{position:"relative",zIndex:1,padding:"26px 22px"}}>
          <div style={{fontSize:11,letterSpacing:.15,textTransform:"uppercase",color:"rgba(255,255,255,0.55)",marginBottom:8,fontWeight:700}}>🎵 오늘의 추천 · 실시간 1위</div>
          <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:3,letterSpacing:-.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{todayPick.t}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginBottom:20,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{todayPick.ar}{todayPick.yr?` · ${todayPick.yr}`:""}</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",color:"#fff",padding:"9px 18px",borderRadius:10,fontSize:13,fontWeight:600}}
              onClick={e=>{e.stopPropagation();onTrack(todayPick);}}>+ 기록하기</div>
            <div style={{background:"rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.7)",padding:"9px 18px",borderRadius:10,fontSize:13}}>자세히 →</div>
          </div>
        </div>
      </div>
      )}

      {/* 지금 뜨는 곡 */}
      <Sec title="지금 뜨는 곡" t={t} action="전체보기" onAction={()=>onSeeAll("trending","지금 뜨는 곡",trending)}>
        {loading?<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>
        :<HScroll>{trending.map((tr,i)=><TCard key={i} item={tr} t={t} onClick={()=>onTrack(tr)} recorded={!!records[String(tr.id||tr.itunesId)]}/>)}</HScroll>}
      </Sec>

      {/* 최신 앨범 */}
      <Sec title="최신 앨범" t={t} action="전체보기" onAction={()=>onSeeAll("albums","최신 앨범",newAlbums)}>
        {loading?<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>
        :<HScroll>{newAlbums.map((al,i)=><TCard key={i} item={al} t={t} onClick={()=>onAlbum(al)} w={150}/>)}</HScroll>}
      </Sec>

      {/* 차트 */}
      <Sec title="오늘의 차트" t={t} action="전체보기" onAction={()=>onSeeAll("chart","오늘의 차트",chartTracks,
        chart==="global"?"global":chart==="kr"?"kr":chart==="pop"?"pop":chart==="kpop"?"kpop":"indie"
      )}>
        <div style={{display:"flex",gap:8,padding:"0 20px",marginBottom:12,overflowX:"auto"}}>
          {Object.entries(chartLabels).map(([id,label])=>(
            <div key={id} style={{flexShrink:0,padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
              background:chart===id?C.primary:t.sf,color:chart===id?"#fff":t.tx2,border:`1px solid ${chart===id?C.primary:t.bd}`}}
              onClick={()=>setChart(id)}>{label}</div>
          ))}
        </div>
        {chartTracks.length===0&&!loading&&<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>}
        {chartTracks.map((tr,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",cursor:"pointer",borderBottom:`1px solid ${t.bd}`}} onClick={()=>onTrack(tr)}>
            <span style={{fontSize:15,fontWeight:700,color:i<3?C.primary:t.tx3,width:22,flexShrink:0,textAlign:"right"}}>{i+1}</span>
            <div style={{width:46,height:46,borderRadius:9,flexShrink:0,overflow:"hidden",
              background:tr.coverUrl?"#111":bg(i%8),
              backgroundImage:tr.coverUrl?`url(${tr.coverUrl})`:"none",
              backgroundSize:"cover",backgroundPosition:"center",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(255,255,255,0.3)"}}>
              {!tr.coverUrl&&"♪"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx}}>{tr.t}</div>
              <div style={{fontSize:12,color:t.tx2,marginTop:1}}>{tr.ar}</div>
            </div>
          </div>
        ))}
      </Sec>

      {/* 시대별 명곡 */}
      <Sec title="시대별 명곡" t={t} action="전체보기" onAction={()=>onSeeAll("era",`${era} 명곡`,eraTracks,{
        "70s":"1970s classic rock disco hits","80s":"1980s pop rock new wave",
        "90s":"1990s grunge alternative pop","00s":"2000s pop hits",
        "10s":"2010s pop hits adele","20s":"2020s hits popular"
      }[era])}>
        <div style={{display:"flex",gap:8,padding:"0 20px",marginBottom:16,overflowX:"auto"}}>
          {["70s","80s","90s","00s","10s","20s"].map(e=>(
            <div key={e} style={{flexShrink:0,padding:"7px 16px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",
              background:era===e?t.tx:t.sf,color:era===e?t.bg:t.tx2,border:`1px solid ${era===e?t.tx:t.bd}`}}
              onClick={()=>setEra(e)}>{e}</div>
          ))}
        </div>
        {eraTracks.length===0?<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>
        :<HScroll>{eraTracks.slice(0,8).map((tr,i)=><TCard key={i} item={tr} t={t} onClick={()=>onTrack(tr)} recorded={!!records[String(tr.id||tr.itunesId)]}/>)}</HScroll>}
      </Sec>

      <div style={{margin:"0 20px 40px",background:dark?"#0D0D1A":"#F3EEFF",border:`1px solid ${C.primary}25`,borderRadius:20,padding:"22px"}}>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:.15,color:C.primary,fontWeight:700,marginBottom:6}}>✦ Pro 멤버십</div>
        <div style={{fontSize:18,fontWeight:700,color:t.tx,marginBottom:6,letterSpacing:-.3}}>무제한으로 기록하세요</div>
        <div style={{fontSize:13,color:t.tx2,lineHeight:1.55,marginBottom:16}}>{CONFIG.pricing.proPlanFeatures.slice(0,4).join(" · ")}</div>
        <div style={{background:C.primary,color:"#fff",padding:"11px 22px",borderRadius:10,fontSize:13,fontWeight:700,display:"inline-block",cursor:"pointer"}} onClick={onSub}>
          {CONFIG.pricing.monthly}으로 시작 →
        </div>
      </div>
    </div>
  );
}

// ── FEED ──────────────────────────────────────────────────────
function FeedScreen({t,onTrack,onUser,onMore,feedItems}){
  const [liked,setLiked]=useState({});
  const [tab,setTab]=useState("hot");
  const items=feedItems&&feedItems.length>0?feedItems:[];
  const sorted=[...items].sort((a,b)=>tab==="hot"?b.likes-a.likes:0);
  return(
    <div>
      <div style={{padding:"52px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{fontSize:30,fontWeight:800,letterSpacing:-.8,color:t.tx}}>피드</div>
        <IconBtn icon="🔔" t={t} onClick={()=>{}}/>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${t.bd}`,marginTop:16}}>
        {[["hot","🔥 인기 기록"],["follow","팔로우"]].map(([id,label])=>(
          <div key={id} style={{flex:1,textAlign:"center",padding:"13px",fontSize:13,
            fontWeight:tab===id?700:400,color:tab===id?C.primary:t.tx2,
            borderBottom:tab===id?`2px solid ${C.primary}`:"2px solid transparent",cursor:"pointer"}}
            onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>
      {sorted.length===0&&(
        <div style={{padding:"60px 20px",textAlign:"center",color:t.tx2}}>
          아직 피드가 없어요<br/>
          <span style={{fontSize:12,color:t.tx3,display:"block",marginTop:6}}>곡을 기록하고 공개하면 여기 나타나요</span>
        </div>
      )}
      {sorted.map((r,i)=>(
        <div key={r.id} style={{padding:"18px 20px",borderBottom:`1px solid ${t.bd}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"}} onClick={()=>onUser(r.uid,r.user)}>
            <div style={{width:34,height:34,borderRadius:"50%",background:bg(i),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:700,flexShrink:0}}>
              {r.user[0].toUpperCase()}
            </div>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:t.tx}}>{r.user}</span>
              <span style={{fontSize:11,color:t.tx3,marginLeft:8}}>{r.time}</span>
            </div>
            <div style={{marginLeft:"auto"}} onClick={e=>{e.stopPropagation();onMore({t:r.track,ar:r.artist,coverUrl:r.coverUrl||""});}}>
              <span style={{color:t.tx3,fontSize:18,cursor:"pointer",padding:"0 4px"}}>···</span>
            </div>
          </div>
          <div style={{display:"flex",gap:14,cursor:"pointer",marginBottom:r.memo?12:0}} onClick={()=>onTrack({id:r.uid,t:r.track,ar:r.artist,coverUrl:r.coverUrl||""})}>
            <div style={{width:60,height:60,borderRadius:10,flexShrink:0,overflow:"hidden",background:r.coverUrl?"#111":bg(i%8)}}>
              {r.coverUrl?<img src={r.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"rgba(255,255,255,0.3)"}}>♪</div>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,letterSpacing:-.3,color:t.tx,lineHeight:1.3}}>{r.track}</div>
              <div style={{fontSize:12,color:t.tx2,marginTop:3}}>{r.artist}</div>
              <Stars n={r.rating} s={13}/>
            </div>
          </div>
          {r.memo&&<div style={{fontSize:13,color:t.tx2,lineHeight:1.65,background:t.sf,padding:"12px 14px",borderRadius:12,marginBottom:12,fontStyle:"italic",border:`1px solid ${t.bd}`}}>"{r.memo}"</div>}
          <div style={{display:"flex",gap:22,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",color:liked[i]?C.primary:t.tx3,fontSize:14,fontWeight:liked[i]?700:400}}
              onClick={()=>setLiked(p=>({...p,[i]:!p[i]}))}>
              {liked[i]?"♥":"♡"} {r.likes+(liked[i]?1:0)}
            </div>
            <div style={{color:t.tx3,fontSize:14,cursor:"pointer"}}>💬 댓글 <span style={{fontSize:11}}>(준비중)</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SEARCH ────────────────────────────────────────────────────
function SearchScreen({t,onTrack,onAlbum,records,onSeeAll,onGenre}){
  const [q,setQ]=useState("");
  const [results,setResults]=useState({tracks:[],albums:[],artists:[]});
  const [loading,setLoading]=useState(false);
  const [searchTab,setSearchTab]=useState("all");
  const [popularTracks,setPopularTracks]=useState([]);
  const [genreCovers,setGenreCovers]=useState({});

  const genres=[
    {n:"K-Pop",   c:"#2d1b2d", chartKey:"kpop"},
    {n:"J-Pop",   c:"#1a1a3a", chartKey:"jpop"},
    {n:"인디",    c:"#0a2e1b", chartKey:"indie"},
    {n:"팝",      c:"#2d1418", chartKey:"pop"},
    {n:"클래식",  c:"#2a1a0a", chartKey:"classic"},
    {n:"OST",     c:"#0a2d3d", chartKey:"ost"},
    {n:"힙합",    c:"#1a2a0a", chartKey:"hiphop"},
    {n:"R&B",     c:"#2a1a18", chartKey:"rnb"},
    {n:"재즈",    c:"#0e1b4a", chartKey:"jazz"},
    {n:"댄스",    c:"#2a1a3a", chartKey:"dance"},
  ];

  useEffect(()=>{
    // 지금 인기 = Spotify 한국 Top 50
    getChart("kr", 10).then(d=>setPopularTracks(d)).catch(()=>{});
    // 장르별 썸네일: 각 장르 차트 1위 곡 커버
    genres.forEach(g=>{
      getChart(g.chartKey, 1).then(d=>{
        if(d[0]?.coverUrl) setGenreCovers(p=>({...p,[g.n]:d[0].coverUrl}));
      }).catch(()=>{});
    });
  },[]);

  useEffect(()=>{
    if(!q.trim()){setResults({tracks:[],albums:[],artists:[]});setSearchTab("all");return;}
    const timer=setTimeout(async()=>{
      setLoading(true);
      try{
        const [trackAlbum,artistData]=await Promise.all([
          searchMusic(q,"KR"),
          searchMusic(q,"KR"),
        ]);
        // 아티스트: 동일 아티스트명 중복 제거
        const artistMap=new Map();
        [...trackAlbum.tracks,...trackAlbum.albums].forEach(item=>{
          if(item.ar&&!artistMap.has(item.ar)){
            artistMap.set(item.ar,{name:item.ar,coverUrl:item.coverUrl||""});
          }
        });
        setResults({
          tracks:trackAlbum.tracks,
          albums:trackAlbum.albums,
          artists:Array.from(artistMap.values()).slice(0,5),
        });
      }catch(e){console.error(e);}
      setLoading(false);
    },400);
    return()=>clearTimeout(timer);
  },[q]);

  const trackItem=(tr,i)=>(
    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",cursor:"pointer",borderBottom:`1px solid ${t.bd}`}} onClick={()=>onTrack(tr)}>
      <div style={{width:46,height:46,borderRadius:9,flexShrink:0,overflow:"hidden",
        background:tr.coverUrl?"#111":bg(i%8),
        backgroundImage:tr.coverUrl?`url(${tr.coverUrl})`:"none",
        backgroundSize:"cover",backgroundPosition:"center",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(255,255,255,0.3)"}}>
        {!tr.coverUrl&&"♪"}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{tr.t}</div>
        <div style={{fontSize:12,color:t.tx2,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{tr.ar}</div>
      </div>
      {records[String(tr.id||tr.itunesId)]&&<span style={{fontSize:10,color:C.primary,background:`${C.primary}15`,padding:"2px 7px",borderRadius:10,flexShrink:0,fontWeight:600}}>기록됨</span>}
    </div>
  );

  const albumItem=(al,i)=>(
    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",cursor:"pointer",borderBottom:`1px solid ${t.bd}`}}
      onClick={()=>onAlbum(al)}>
      <div style={{width:46,height:46,borderRadius:9,flexShrink:0,overflow:"hidden",background:al.coverUrl?"#111":bg(i%8)}}>
        {al.coverUrl?<img src={al.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(255,255,255,0.3)"}}>♪</div>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{al.t}</div>
        <div style={{fontSize:12,color:t.tx2,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{al.ar} · {al.yr}</div>
      </div>
      <span style={{color:t.tx3,fontSize:13,flexShrink:0}}>앨범 ›</span>
    </div>
  );

  const artistItem=(ar,i)=>(
    <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 20px",cursor:"pointer",borderBottom:`1px solid ${t.bd}`}}
      onClick={()=>onSeeAll("artist",ar.name,[],ar.name)}>
      <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:bg(i%8)}}>
        {ar.coverUrl?<img src={ar.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"rgba(255,255,255,0.3)"}}>🎤</div>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{ar.name}</div>
        <div style={{fontSize:12,color:t.tx2,marginTop:1,textAlign:"left"}}>아티스트</div>
      </div>
      <span style={{color:t.tx3,fontSize:16}}>›</span>
    </div>
  );

  return(
    <div>
      <div style={{padding:"52px 20px 16px"}}>
        <div style={{fontSize:30,fontWeight:800,letterSpacing:-.8,color:t.tx,marginBottom:16}}>탐색</div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:t.tx3,fontSize:17}}>⌕</span>
          <input style={{...inputStyle(t),paddingLeft:44,paddingRight:40}}
            placeholder="곡, 앨범, 아티스트 검색" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:t.tx3,cursor:"pointer",fontSize:15}} onClick={()=>setQ("")}>✕</span>}
        </div>
      </div>
      {q?(
        <div>
          {/* 탭 */}
          <div style={{display:"flex",gap:8,padding:"0 20px 12px",overflowX:"auto"}}>
            {[["all","전체"],["tracks","곡"],["albums","앨범"],["artists","아티스트"]].map(([id,label])=>(
              <div key={id} style={{flexShrink:0,padding:"6px 16px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",
                background:searchTab===id?C.primary:t.sf,
                color:searchTab===id?"#fff":t.tx2,
                border:`1px solid ${searchTab===id?C.primary:t.bd}`}}
                onClick={()=>setSearchTab(id)}>{label}</div>
            ))}
          </div>
          {loading&&<div style={{padding:"24px 20px",textAlign:"center",color:t.tx3,fontSize:13}}>검색 중...</div>}
          {!loading&&(
            <>
              {(searchTab==="all"||searchTab==="artists")&&results.artists?.length>0&&(
                <>
                  {searchTab==="all"&&<div style={{padding:"12px 20px 4px",fontSize:12,fontWeight:600,color:t.tx3,textTransform:"uppercase",letterSpacing:.1}}>아티스트</div>}
                  {results.artists.map(artistItem)}
                </>
              )}
              {(searchTab==="all"||searchTab==="tracks")&&results.tracks.map(trackItem)}
              {(searchTab==="all"||searchTab==="albums")&&results.albums.map(albumItem)}
              {results.tracks.length===0&&results.albums.length===0&&(
                <div style={{padding:"48px 20px",textAlign:"center",color:t.tx2}}>검색 결과가 없어요</div>
              )}
            </>
          )}
        </div>
      ):(
        <>
          <Sec title="장르" t={t}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 20px"}}>
              {genres.map(g=>(
                <div key={g.n} style={{position:"relative",borderRadius:14,
                  background:g.c,fontSize:15,fontWeight:700,cursor:"pointer",
                  overflow:"hidden",height:80,display:"flex",alignItems:"flex-end"}}
                  onClick={()=>onGenre(g.n, g.chartKey)}>
                  {genreCovers[g.n]&&(
                    <img src={genreCovers[g.n]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
                  )}
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}}/>
                  <span style={{position:"relative",zIndex:1,padding:"0 14px 14px",color:"#fff",fontSize:14,fontWeight:700}}>{g.n}</span>
                </div>
              ))}
            </div>
          </Sec>
          <Sec title="지금 인기" t={t} action="전체보기" onAction={()=>onSeeAll("popular","지금 인기",popularTracks,"top hits popular")}>
            {popularTracks.length===0?<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>
            :popularTracks.slice(0,6).map((tr,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",cursor:"pointer",borderBottom:`1px solid ${t.bd}`}} onClick={()=>onTrack(tr)}>
                <span style={{fontSize:15,fontWeight:700,color:i<3?C.primary:t.tx3,width:22,flexShrink:0,textAlign:"right"}}>{i+1}</span>
                <div style={{width:46,height:46,borderRadius:9,flexShrink:0,overflow:"hidden",
                  background:tr.coverUrl?"#111":bg(i%8),
                  backgroundImage:tr.coverUrl?`url(${tr.coverUrl})`:"none",
                  backgroundSize:"cover",backgroundPosition:"center",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(255,255,255,0.3)"}}>
                  {!tr.coverUrl&&"♪"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{tr.t}</div>
                  <div style={{fontSize:12,color:t.tx2,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{tr.ar}</div>
                </div>
              </div>
            ))}
          </Sec>
        </>
      )}
    </div>
  );
}

// ── ARCHIVE ───────────────────────────────────────────────────
function ArchiveScreen({t,onTrack,records,lists,trackLists}){
  const [tab,setTab]=useState("all");
  const [sort,setSort]=useState("recent");
  const [q,setQ]=useState("");

  // records 객체에서 직접 트랙 목록 생성
  const rTracks=Object.entries(records).map(([tid,rec])=>({
    id:tid,
    spotifyId:rec.spotifyId||tid,
    t:rec.track_title||"",
    ar:rec.artist||"",
    al:rec.album||"",
    coverUrl:rec.coverUrl||"",
    rating:rec.rating||0,
    g:0,
  }));

  const filtered=useMemo(()=>{
    let res=rTracks;
    if(q) res=res.filter(tr=>tr.t.toLowerCase().includes(q.toLowerCase())||tr.ar.toLowerCase().includes(q.toLowerCase()));
    if(sort==="rating") res=[...res].sort((a,b)=>b.rating-a.rating);
    if(sort==="title") res=[...res].sort((a,b)=>a.t.localeCompare(b.t));
    return res;
  },[q,sort,records]);

  const GridCard=({tr})=>{
    const rec=records[tr.id];
    return(
      <div style={{background:t.sf,borderRadius:14,overflow:"hidden",cursor:"pointer",border:`1px solid ${t.bd}`}} onClick={()=>onTrack(tr)}>
        <div style={{height:140,background:tr.coverUrl?"#111":bg(tr.g||0),
          backgroundImage:tr.coverUrl?`url(${tr.coverUrl})`:"none",
          backgroundSize:"cover",backgroundPosition:"center",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,color:"rgba(255,255,255,0.2)"}}>
          {!tr.coverUrl&&"♪"}
        </div>
        <div style={{padding:"11px"}}>
          <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx}}>{tr.t}</div>
          <div style={{fontSize:11,color:t.tx2}}>{tr.ar}</div>
          <Stars n={rec?.rating||0} s={10}/>
        </div>
      </div>
    );
  };

  return(
    <div>
      <div style={{padding:"52px 20px 0"}}>
        <div style={{fontSize:30,fontWeight:800,letterSpacing:-.8,color:t.tx,marginBottom:4}}>보관함</div>
        <div style={{display:"flex",gap:20,marginBottom:16}}>
          {[[rTracks.length,"곡"],[0,"앨범"],[lists.length,"리스트"]].map(([n,l])=>(
            <div key={l}><span style={{fontSize:20,fontWeight:700,color:t.tx}}>{n}</span><span style={{fontSize:13,color:t.tx2,marginLeft:3}}>{l}</span></div>
          ))}
        </div>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:t.tx3,fontSize:15}}>⌕</span>
          <input style={{...inputStyle(t),paddingLeft:34,paddingRight:36,padding:"11px 36px 11px 34px"}} placeholder="보관함 내 검색" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:t.tx3,cursor:"pointer",fontSize:13}} onClick={()=>setQ("")}>✕</span>}
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${t.bd}`}}>
        {[["all","전체"],["tracks","곡"],["albums","앨범"],["lists","리스트"]].map(([id,label])=>(
          <div key={id} style={{flex:1,textAlign:"center",padding:"12px 4px",fontSize:13,fontWeight:tab===id?700:400,color:tab===id?C.primary:t.tx2,borderBottom:tab===id?`2px solid ${C.primary}`:"2px solid transparent",cursor:"pointer"}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>
      {tab!=="lists"&&(
        <div style={{display:"flex",gap:16,padding:"12px 20px",borderBottom:`1px solid ${t.bd}`}}>
          {[["recent","최신순"],["rating","별점순"],["title","제목순"]].map(([id,label])=>(
            <span key={id} style={{fontSize:13,color:sort===id?C.primary:t.tx2,cursor:"pointer",fontWeight:sort===id?600:400,borderBottom:sort===id?`1px solid ${C.primary}`:"none",paddingBottom:2}} onClick={()=>setSort(id)}>{label}</span>
          ))}
        </div>
      )}
      {tab==="all"&&(
        <div>
          {filtered.length>0&&(<><div style={{padding:"18px 20px 10px",fontSize:13,fontWeight:600,color:t.tx2}}>곡 {filtered.length}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 20px 8px"}}>{filtered.slice(0,4).map(tr=><GridCard key={tr.id} tr={tr}/>)}</div></>)}
          <div style={{padding:"18px 20px 10px",fontSize:13,fontWeight:600,color:t.tx2}}>앨범 0</div>
          <div style={{padding:"0 20px 20px",color:t.tx3,fontSize:13,textAlign:"center"}}>아직 기록된 앨범이 없어요</div>
          <div style={{padding:"4px 20px 10px",fontSize:13,fontWeight:600,color:t.tx2}}>리스트 {lists.length}</div>
          <div style={{padding:"0 20px"}}>
            {lists.slice(0,2).map((l,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}}>
                <div style={{width:50,height:50,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden",flexShrink:0}}>
                  {l.gs.map((g,j)=><div key={j} style={{background:bg(g)}}/>)}
                </div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.tx}}>{l.name}</div><div style={{fontSize:12,color:t.tx2,marginTop:2}}>{l.count}곡</div></div>
                <span style={{color:t.tx3,fontSize:18,alignSelf:"center"}}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==="tracks"&&(filtered.length===0?<div style={{padding:"60px 20px",textAlign:"center",color:t.tx2}}>{q?"검색 결과 없음":"아직 기록된 곡이 없어요"}</div>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"16px 20px"}}>{filtered.map(tr=><GridCard key={tr.id} tr={tr}/>)}</div>)}
      {tab==="albums"&&<div style={{padding:"60px 20px",textAlign:"center",color:t.tx2}}>아직 기록된 앨범이 없어요</div>}
      {tab==="lists"&&(
        <div style={{padding:"16px 20px"}}>
          <div style={{background:C.primary,color:"#fff",padding:"13px",borderRadius:12,textAlign:"center",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:16}}>+ 새 리스트 만들기</div>
          {lists.filter(l=>!q||l.name.includes(q)).map((l,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"13px 0",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}}>
              <div style={{width:56,height:56,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden",flexShrink:0}}>
                {l.gs.map((g,j)=><div key={j} style={{background:bg(g)}}/>)}
              </div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.tx}}>{l.name}</div><div style={{fontSize:12,color:t.tx2,marginTop:2}}>{l.count}곡</div></div>
              <span style={{color:t.tx3,fontSize:18,alignSelf:"center"}}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TRACK DETAIL ──────────────────────────────────────────────
function TrackScreen({t,track,onBack,onRecord,onListModal,onMore,onAlbum,onSimilar,records,trackLists,lists}){
  const tr=track||TRACKS[0];
  const trackId=String(tr.id||tr.itunesId||'');
  const existing=records[trackId];
  const inLists=(trackLists[trackId]||[]).map(lid=>lists.find(l=>l.id===lid)).filter(Boolean);
  const typeLabel={album_track:"앨범 수록곡","앨범 수록곡":"앨범 수록곡",single:"싱글","싱글":"싱글",ost:"OST",ep:"EP",collab:"콜라보"};
  const [similar,setSimilar]=useState([]);

  useEffect(()=>{
    // BPM 로드
    if(tr.spotifyId && !tr.bpm){
      getTrackWithFeatures(tr.spotifyId).then(d=>{
        if(d.bpm) setSimilar(prev=>prev); // bpm은 tr에 직접 못 넣으므로 별도 state
      }).catch(()=>{});
    }
    // 비슷한 곡
    if(tr.spotifyId){
      getRecommendations(tr.spotifyId, 8).then(d=>setSimilar(d.filter(x=>x.id!==tr.id))).catch(()=>{});
    } else if(tr.ar){
      searchMusic(tr.ar).then(d=>setSimilar(d.tracks.filter(x=>x.id!==tr.id).slice(0,8))).catch(()=>{});
    }
  },[tr.spotifyId||tr.ar]);

  const coverBg = tr.coverUrl ? {backgroundImage:`url(${tr.coverUrl})`,backgroundSize:"cover",backgroundPosition:"center"} : {background:`linear-gradient(180deg,${GR[(tr.g||0)%8][0]}cc 0%,${t.bg} 80%)`};

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{position:"relative",overflow:"hidden",paddingBottom:28}}>
        <div style={{position:"absolute",inset:0,...(tr.coverUrl?{}:{background:`linear-gradient(180deg,${GR[(tr.g||0)%8][0]}cc 0%,${t.bg} 80%)`})}}>
          {tr.coverUrl&&<div style={{position:"absolute",inset:0,backgroundImage:`url(${tr.coverUrl})`,backgroundSize:"cover",backgroundPosition:"center",filter:"blur(40px) brightness(0.4)",transform:"scale(1.1)"}}/>}
        </div>
        <div style={{position:"relative",zIndex:1,padding:"0 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:52,paddingBottom:20}}>
            <IconBtn icon="‹" t={t} onClick={onBack}/>
            <IconBtn icon="···" t={t} onClick={()=>onMore(tr)}/>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:22}}>
            {tr.coverUrl
              ?<div style={{width:164,height:164,borderRadius:18,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.4)"}}>
                <img src={tr.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
               </div>
              :<Cover g={tr.g||0} size={164} r={18}/>}
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:26,color:"#fff",letterSpacing:-.5,lineHeight:1.2}}>{tr.t}</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.6)",marginTop:6}}>{tr.ar}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:3}}>{typeLabel[tr.type]||"앨범 수록곡"} · {tr.al} · {tr.yr}</div>
            {tr.al&&tr.collectionId&&(
              <div style={{marginTop:8,display:"inline-block",padding:"5px 14px",background:"rgba(255,255,255,0.12)",borderRadius:20,fontSize:12,color:"rgba(255,255,255,0.7)",cursor:"pointer"}}
                onClick={()=>onAlbum&&onAlbum({id:String(tr.collectionId),itunesId:tr.collectionId,t:tr.al,ar:tr.ar,coverUrl:tr.coverUrl,yr:tr.yr,altype:"앨범",genre:tr.genre||"",label:"",tracks:0,dur:"",rec:0,rt:0,g:0})}>
                앨범 보기 →
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-around",padding:"20px",marginBottom:22}}>
        {[["0","기록"],["—","평점"],["—","리뷰"]].map(([n,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:t.tx,letterSpacing:-.5}}>{n}</div>
            <div style={{fontSize:11,color:t.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,padding:"0 20px",marginBottom:existing||inLists.length>0?14:22}}>
        <div style={{flex:1,background:existing?t.sf:C.primary,color:existing?C.primary:"#fff",
          border:existing?`1.5px solid ${C.primary}`:"none",
          padding:"14px",borderRadius:14,textAlign:"center",fontSize:14,fontWeight:700,cursor:"pointer"}}
          onClick={()=>onRecord(tr)}>
          {existing?"✓ 기록 수정":"+ 기록하기"}
        </div>
        <div style={{flex:1,background:inLists.length>0?`${C.primary}12`:t.sf,
          border:`1.5px solid ${inLists.length>0?C.primary:t.bd}`,color:inLists.length>0?C.primary:t.tx,
          padding:"14px",borderRadius:14,textAlign:"center",fontSize:14,fontWeight:600,cursor:"pointer"}}
          onClick={()=>onListModal(tr)}>
          {inLists.length>0?`◈ ${inLists.length}개 리스트`:"◈ 리스트에 담기"}
        </div>
      </div>

      {inLists.length>0&&(
        <div style={{display:"flex",gap:8,padding:"0 20px",marginBottom:20,flexWrap:"wrap"}}>
          {inLists.map((l,i)=>(
            <span key={i} style={{fontSize:11,background:`${C.primary}12`,color:C.primary,padding:"5px 12px",borderRadius:20,fontWeight:600}}>◈ {l?.name||""}</span>
          ))}
        </div>
      )}

      {existing&&(
        <div style={{margin:"0 20px 20px",background:t.sf,borderRadius:16,padding:"16px 18px",border:`1px solid ${t.bd}`}}>
          <div style={{fontSize:11,color:C.primary,letterSpacing:.12,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>나의 기록</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:existing.memo?8:0}}>
            <Stars n={existing.rating} s={15}/>
            <span style={{fontSize:12,color:t.tx3}}>{existing.date}</span>
          </div>
          {existing.memo&&<div style={{fontSize:13,color:t.tx2,lineHeight:1.65,fontStyle:"italic",marginTop:6}}>"{existing.memo}"</div>}
        </div>
      )}

      {/* 외부 링크 */}
      <div style={{display:"flex",gap:8,padding:"0 20px",overflowX:"auto",marginBottom:28}}>
        {getStreamingLinks(tr).map(link=>(
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{flexShrink:0,padding:"9px 16px",border:`1px solid ${t.bd}`,borderRadius:20,
            fontSize:12,color:t.tx2,cursor:"pointer",whiteSpace:"nowrap",background:t.sf,
            textDecoration:"none",display:"block"}}>▶ {link.name}</a>
        ))}
      </div>

      {/* 곡 정보 */}
      <div style={{margin:"0 20px 28px"}}>
        <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:12}}>곡 정보</div>
        <div style={{background:t.sf,borderRadius:16,padding:"4px 0",border:`1px solid ${t.bd}`}}>
          {[
            ["장르", tr.genre||"—"],
            ["길이", tr.dur||"—"],
            ["발매연도", tr.yr?`${tr.yr}년`:"—"],
            ["유형", typeLabel[tr.type]||"앨범 수록곡"],
          ].map(([label,val],i,arr)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"13px 18px",borderBottom:i<arr.length-1?`1px solid ${t.bd}`:"none"}}>
              <span style={{fontSize:14,color:t.tx2}}>{label}</span>
              <span style={{fontSize:14,fontWeight:500,color:t.tx}}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 곡 소개 */}
      <div style={{margin:"0 20px 28px",background:t.sf,borderRadius:16,padding:"20px",border:`1px solid ${t.bd}`}}>
        <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:8}}>곡 소개</div>
        <div style={{fontSize:13,color:t.tx3,lineHeight:1.7}}>
          곡 소개를 준비 중이에요 🎵<br/>
          <span style={{fontSize:11}}>Wikipedia 연동 후 자동으로 채워질 예정이에요</span>
        </div>
      </div>

      {similar.length>0&&(
        <Sec title={`${tr.ar}의 다른 곡`} t={t}>
          <HScroll>{similar.map((s,i)=><TCard key={i} item={s} t={t} onClick={()=>onSimilar&&onSimilar(s)} w={115}/>)}</HScroll>
        </Sec>
      )}

      <div style={{height:1,background:t.bd,margin:"0 0 4px"}}/>
      <Sec title="리뷰" t={t} action="전체보기">
        <div style={{padding:"20px 20px 8px",textAlign:"left",color:t.tx3,fontSize:13}}>
          아직 등록된 리뷰가 없어요<br/>
          <span style={{fontSize:11,marginTop:4,display:"block"}}>첫 번째 리뷰를 남겨보세요</span>
        </div>
      </Sec>
    </div>
  );
}

// ── ALBUM DETAIL ──────────────────────────────────────────────
function AlbumScreen({t,album,onBack,onTrack,records}){
  const al=album||{t:"",ar:"",g:0,yr:null,altype:"앨범",label:"",genre:"",tracks:0,dur:"",rec:0,rt:0};
  const [alTracks,setAlTracks]=useState([]);
  const [loadingTracks,setLoadingTracks]=useState(true);

  useEffect(()=>{
    const id=al.itunesId||al.collectionId||al.id;
    if(!id){setLoadingTracks(false);return;}
    setLoadingTracks(true);
    getAlbumTracks(id).then(data=>{
      if(data.trackList?.length>0) setAlTracks(data.trackList);
      setLoadingTracks(false);
    }).catch(()=>setLoadingTracks(false));
  },[al.itunesId||al.id]);

  const coverBg=al.coverUrl
    ?{backgroundImage:`url(${al.coverUrl})`,backgroundSize:"cover",backgroundPosition:"center",filter:"blur(40px) brightness(0.35)",transform:"scale(1.1)"}
    :{background:`linear-gradient(180deg,${GR[(al.g||0)%8][0]}cc 0%,${t.bg} 82%)`};

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{position:"relative",overflow:"hidden",paddingBottom:24}}>
        <div style={{position:"absolute",inset:0}}>
          {al.coverUrl
            ?<div style={{position:"absolute",inset:0,...coverBg}}/>
            :<div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,${GR[(al.g||0)%8][0]}cc 0%,${t.bg} 82%)`}}/>}
        </div>
        <div style={{position:"relative",zIndex:1,padding:"0 20px"}}>
          <div style={{paddingTop:52,paddingBottom:20}}><IconBtn icon="‹" t={t} onClick={onBack}/></div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
            {al.coverUrl
              ?<div style={{width:170,height:170,borderRadius:18,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.4)"}}>
                <img src={al.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
               </div>
              :<Cover g={al.g||0} size={170} r={18}/>}
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:24,color:"#fff",letterSpacing:-.5,lineHeight:1.2}}>{al.t}</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.6)",marginTop:5}}>{al.ar}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:3}}>{al.altype||"앨범"} · {al.yr}</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-around",padding:"20px",marginBottom:22}}>
        {[["0","기록"],["—","평점"],[alTracks.length||al.tracks||"—","트랙"]].map(([n,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:t.tx,letterSpacing:-.5}}>{n}</div>
            <div style={{fontSize:11,color:t.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,padding:"0 20px",marginBottom:28}}>
        <div style={{flex:1,background:C.primary,color:"#fff",padding:"14px",borderRadius:14,textAlign:"center",fontSize:14,fontWeight:700,cursor:"pointer"}}>+ 앨범 기록하기</div>
        <div style={{flex:1,background:t.sf,border:`1.5px solid ${t.bd}`,color:t.tx,padding:"14px",borderRadius:14,textAlign:"center",fontSize:14,fontWeight:600,cursor:"pointer"}}>◈ 리스트에 담기</div>
      </div>
      <div style={{margin:"0 20px 28px"}}>
        <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:12}}>앨범 정보</div>
        <div style={{background:t.sf,borderRadius:16,padding:"4px 0",border:`1px solid ${t.bd}`}}>
          {[["유형",al.altype||"앨범"],["장르",al.genre||"—"],["레이블",al.label||"—"],["발매연도",al.yr?`${al.yr}년`:"—"]].map(([label,val],i,arr)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px",borderBottom:i<arr.length-1?`1px solid ${t.bd}`:"none"}}>
              <span style={{fontSize:14,color:t.tx2}}>{label}</span>
              <span style={{fontSize:14,fontWeight:500,color:t.tx}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"0 20px 16px"}}>
        <div style={{fontSize:17,fontWeight:700,color:t.tx,marginBottom:14,letterSpacing:-.3}}>
          수록곡 {alTracks.length||""}
        </div>
        {loadingTracks&&<div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>수록곡 불러오는 중...</div>}
        {alTracks.map((tr,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}} onClick={()=>onTrack(tr)}>
            <span style={{fontSize:14,color:t.tx3,width:22,textAlign:"right",flexShrink:0}}>{i+1}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:t.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tr.t}</div>
              <div style={{fontSize:12,color:t.tx2,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tr.ar||al.ar}</div>
            </div>
            {records[String(tr.id||tr.itunesId)]&&<span style={{fontSize:11,color:C.primary,fontWeight:700,flexShrink:0}}>✓</span>}
          </div>
        ))}
        {!loadingTracks&&alTracks.length===0&&(
          <div style={{padding:"20px",textAlign:"center",color:t.tx3,fontSize:13}}>수록곡 정보를 불러올 수 없어요</div>
        )}
      </div>
    </div>
  );
}

// ── ANNUAL REPORT ─────────────────────────────────────────────
function AnnualReport({t,onBack,records}){
  const months=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

  // records에서 실제 데이터 계산
  const recList=Object.values(records||{});
  const totalCount=recList.length;

  // 아티스트별 집계
  const artistCount={};
  recList.forEach(r=>{
    const ar=r.artist||"알 수 없음";
    artistCount[ar]=(artistCount[ar]||0)+1;
  });
  const topArtists=Object.entries(artistCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // 월별 집계 (listened_date 기준)
  const monthlyCounts=Array(12).fill(0);
  recList.forEach(r=>{
    if(r.date){
      const m=new Date(r.date).getMonth();
      if(!isNaN(m)) monthlyCounts[m]++;
    }
  });
  const maxCount=Math.max(...monthlyCounts,1);

  // 올해의 곡 (가장 최근 기록)
  const topTrack=recList.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0];

  const hasData=totalCount>0;

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:60}}>
      <div style={{background:`linear-gradient(160deg,${GR[1][0]},${GR[5][0]},${C.primaryDark})`,padding:"52px 24px 40px"}}>
        <div style={{marginBottom:32}}>
          <div onClick={onBack} style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <span style={{fontSize:17,color:"#fff"}}>‹</span>
          </div>
        </div>
        <div style={{fontSize:11,letterSpacing:.18,textTransform:"uppercase",color:"rgba(255,255,255,0.5)",fontWeight:700,marginBottom:10}}>2025 {CONFIG.service.name}</div>
        <div style={{fontSize:40,fontWeight:800,color:"#fff",letterSpacing:-2,lineHeight:1.1,marginBottom:6}}>나의<br/>연간 리포트</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.5)"}}>2025년 기록 통계</div>
      </div>

      <div style={{padding:"32px 20px 0"}}>
        {/* 총 기록 수 */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:80,fontWeight:800,color:t.tx,letterSpacing:-4,lineHeight:1}}>{totalCount}</div>
          <div style={{fontSize:16,color:t.tx2,marginTop:8}}>곡을 기록했어요</div>
          {totalCount===0&&<div style={{fontSize:13,color:t.tx3,marginTop:8}}>탐색에서 곡을 찾아 기록을 시작해보세요 🎵</div>}
        </div>

        {/* 올해의 아티스트 */}
        <div style={{marginBottom:36}}>
          <div style={{fontSize:18,fontWeight:700,color:t.tx,marginBottom:16,letterSpacing:-.3}}>가장 많이 기록한 아티스트</div>
          {!hasData&&<div style={{fontSize:13,color:t.tx3}}>기록이 쌓이면 여기에 나타나요</div>}
          {topArtists.map(([name,count],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
              <span style={{fontSize:20,fontWeight:800,color:i===0?C.primary:t.tx3,width:24}}>{i+1}</span>
              <Cover g={i} size={48} r={10}/>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:600,color:t.tx}}>{name}</div>
                <div style={{fontSize:12,color:t.tx2}}>{count}곡</div>
              </div>
            </div>
          ))}
        </div>

        {/* 월별 기록 */}
        <div style={{marginBottom:36}}>
          <div style={{fontSize:18,fontWeight:700,color:t.tx,marginBottom:16,letterSpacing:-.3}}>월별 기록</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
            {months.map((m,i)=>(
              <div key={m} style={{textAlign:"center"}}>
                <div style={{height:50,background:monthlyCounts[i]>0?`${C.primary}${Math.round((monthlyCounts[i]/maxCount)*220+35).toString(16).padStart(2,"0")}`:t.sf2,borderRadius:8,marginBottom:5}}/>
                <div style={{fontSize:10,color:t.tx3}}>{m}</div>
                <div style={{fontSize:11,fontWeight:600,color:t.tx}}>{monthlyCounts[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 기록 곡 */}
        {topTrack&&(
          <div style={{background:t.sf,borderRadius:20,padding:"20px",marginBottom:24,border:`1px solid ${t.bd}`}}>
            <div style={{fontSize:12,color:C.primary,fontWeight:700,letterSpacing:.1,textTransform:"uppercase",marginBottom:12}}>가장 최근 기록</div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              {topTrack.coverUrl
                ?<div style={{width:60,height:60,borderRadius:10,overflow:"hidden",flexShrink:0}}><img src={topTrack.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
                :<Cover g={0} size={60} r={10}/>}
              <div>
                <div style={{fontSize:17,fontWeight:800,color:t.tx,letterSpacing:-.3}}>{topTrack.track_title||"알 수 없음"}</div>
                <div style={{fontSize:13,color:t.tx2,marginTop:3}}>{topTrack.artist||""}</div>
                {topTrack.rating>0&&<Stars n={topTrack.rating} s={13}/>}
              </div>
            </div>
          </div>
        )}

        <div style={{borderRadius:20,padding:"24px",textAlign:"center",background:`linear-gradient(135deg,${C.primaryDark},${GR[1][0]})`}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",marginBottom:6}}>2025년에 기록한 곡</div>
          <div style={{fontSize:48,fontWeight:800,color:"#fff",letterSpacing:-2,lineHeight:1}}>{totalCount}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:8}}>계속 기록해나가세요 🎵</div>
        </div>
      </div>
    </div>
  );
}

// ── MY PROFILE ────────────────────────────────────────────────
function MyProfileScreen({t,dark,setDark,onSettings,onSub,records,lists,onTrack,onReport,profile}){
  const [tab,setTab]=useState("records");
  const rTracks=Object.entries(records).map(([tid,rec])=>({
    id:tid,t:rec.track_title||"알 수 없는 곡",ar:rec.artist||"",
    coverUrl:rec.coverUrl||"",g:0,rt:rec.rating||0,
  }));
  const avatars=["🎵","🎸","🎹","🎺","🎻"];
  const avatarIcon=avatars[parseInt(profile?.avatar||"0")]||"🎵";
  return(
    <div>
      <div style={{padding:"52px 20px 0",borderBottom:`1px solid ${t.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:68,height:68,borderRadius:"50%",background:`linear-gradient(145deg,${GR[1][0]},${GR[6][1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,border:`3px solid ${C.primary}`,flexShrink:0}}>{avatarIcon}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:19,fontWeight:800,letterSpacing:-.3,color:t.tx}}>{(profile?.display_name||profile?.username||"내 프로필").trim()}</div>
              {(profile?.bio?.trim())&&<div style={{fontSize:12,color:t.tx2,marginTop:3,lineHeight:1.5}}>{profile.bio.trim()}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,paddingTop:4}}>
            <IconBtn icon={dark?"☀":"☾"} t={t} onClick={()=>setDark(!dark)}/>
            <IconBtn icon="⚙" t={t} onClick={onSettings}/>
          </div>
        </div>
        <div style={{display:"flex",gap:28,marginBottom:16}}>
          {[[rTracks.length,"기록"],["—","팔로워"],["—","팔로잉"],[lists.length,"리스트"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:t.tx}}>{n}</div>
              <div style={{fontSize:10,color:t.tx3,marginTop:1}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1,background:t.sf,border:`1px solid ${t.bd}`,color:t.tx,padding:"10px",borderRadius:12,textAlign:"center",fontSize:13,cursor:"pointer"}} onClick={onSettings}>프로필 수정</div>
          <div style={{flex:1,background:C.primary,color:"#fff",padding:"10px",borderRadius:12,textAlign:"center",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={onSub}>✦ Pro</div>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.primaryDark}cc,${GR[1][0]})`,borderRadius:14,padding:"14px 16px",marginBottom:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={onReport}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:.12,textTransform:"uppercase",fontWeight:700}}>✦ 연간 리포트</div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:3}}>2025년 나의 음악 리포트 보기 →</div>
          </div>
          <div style={{fontSize:28}}>📊</div>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${t.bd}`}}>
        {[["records","기록"],["lists","리스트"],["public","공개 리뷰"]].map(([id,label])=>(
          <div key={id} style={{flex:1,textAlign:"center",padding:"12px",fontSize:13,fontWeight:tab===id?700:400,color:tab===id?C.primary:t.tx2,borderBottom:tab===id?`2px solid ${C.primary}`:"2px solid transparent",cursor:"pointer"}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>
      {tab==="records"&&(rTracks.length===0
        ?<div style={{padding:"60px 20px",textAlign:"center",color:t.tx2,fontSize:13}}>아직 기록된 곡이 없어요<br/><span style={{fontSize:12,color:t.tx3,display:"block",marginTop:6}}>탐색에서 곡을 찾아 기록해보세요</span></div>
        :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
          {rTracks.map((tr,i)=>(
            <div key={tr.id||i} style={{aspectRatio:"1",
              background:tr.coverUrl?"#111":bg(i%8),
              backgroundImage:tr.coverUrl?`url(${tr.coverUrl})`:"none",
              backgroundSize:"cover",backgroundPosition:"center",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:32,color:"rgba(255,255,255,0.2)",cursor:"pointer"}}
              onClick={()=>onTrack(tr)}>
              {!tr.coverUrl&&"♪"}
            </div>
          ))}
        </div>
      )}
      {tab==="lists"&&(
        <div style={{padding:"16px 20px"}}>
          {lists.map((l,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}}>
              <div style={{width:52,height:52,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden",flexShrink:0}}>
                {l.gs.map((g,j)=><div key={j} style={{background:bg(g)}}/>)}
              </div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.tx}}>{l.name}</div><div style={{fontSize:12,color:t.tx2,marginTop:2}}>{l.count}곡</div></div>
              <span style={{color:t.tx3,fontSize:18,alignSelf:"center"}}>›</span>
            </div>
          ))}
        </div>
      )}
      {tab==="public"&&<div style={{padding:"48px 20px",textAlign:"center",color:t.tx2}}>아직 공개한 리뷰가 없어요</div>}
    </div>
  );
}

// ── USER PROFILE ──────────────────────────────────────────────
function UserProfileScreen({t,uid,username,onBack}){
  const [following,setFollowing]=useState(false);
  const [tab,setTab]=useState("records");
  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{padding:"0 20px"}}>
        <div style={{paddingTop:52,paddingBottom:16}}><IconBtn icon="‹" t={t} onClick={onBack}/></div>
        <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:68,height:68,borderRadius:"50%",background:bg(2),display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>🎵</div>
          <div style={{paddingTop:4}}>
            <div style={{fontSize:19,fontWeight:800,letterSpacing:-.3,color:t.tx}}>{username||uid}</div>
            <div style={{fontSize:12,color:t.tx2,marginTop:3,lineHeight:1.5}}>음악을 사랑하는 사람</div>
          </div>
        </div>
        <div style={{display:"flex",gap:28,marginBottom:18}}>
          {[["67","기록"],[String(42+(following?1:0)),"팔로워"],["15","팔로잉"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:t.tx}}>{n}</div>
              <div style={{fontSize:10,color:t.tx3,marginTop:1}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${t.bd}`}}>
          <div style={{flex:1,background:following?t.sf:C.primary,border:following?`1px solid ${t.bd}`:"none",color:following?t.tx:"#fff",padding:"11px",borderRadius:12,textAlign:"center",fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={()=>setFollowing(!following)}>
            {following?"✓ 팔로잉":"팔로우"}
          </div>
          <div style={{background:t.sf,border:`1px solid ${t.bd}`,color:t.tx,padding:"11px 20px",borderRadius:12,textAlign:"center",fontSize:14,cursor:"pointer"}}>메시지 <span style={{fontSize:10,color:t.tx3}}>(준비중)</span></div>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${t.bd}`}}>
        {[["records","기록"],["lists","리스트"]].map(([id,label])=>(
          <div key={id} style={{flex:1,textAlign:"center",padding:"12px",fontSize:13,fontWeight:tab===id?700:400,color:tab===id?C.primary:t.tx2,borderBottom:tab===id?`2px solid ${C.primary}`:"2px solid transparent",cursor:"pointer"}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>
      {tab==="records"?(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
          {TRACKS.slice(0,6).map(tr=>(
            <div key={tr.id} style={{aspectRatio:"1",background:bg(tr.g),display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"rgba(255,255,255,0.2)",cursor:"pointer"}}>♪</div>
          ))}
        </div>
      ):(
        <div style={{padding:"16px 20px"}}>
          {INIT_LISTS.map((l,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}}>
              <div style={{width:52,height:52,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden",flexShrink:0}}>
                {l.gs.map((g,j)=><div key={j} style={{background:bg(g)}}/>)}
              </div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.tx}}>{l.name}</div><div style={{fontSize:12,color:t.tx2}}>{l.count}곡</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 프로필 수정 페이지 ────────────────────────────────────────
function EditProfilePage({t,profile,currentUser,onBack,onSave}){
  const [displayName,setDisplayName]=useState(profile?.display_name||"");
  const [bio,setBio]=useState(profile?.bio||"");
  const [avatar,setAvatar]=useState(profile?.avatar||"0");
  const [loading,setLoading]=useState(false);
  const avatars=["🎵","🎸","🎹","🎺","🎻"];

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{padding:"52px 20px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:`1px solid ${t.bd}`}}>
        <IconBtn icon="‹" t={t} onClick={onBack}/>
        <div style={{flex:1,fontSize:20,fontWeight:800,color:t.tx}}>프로필 수정</div>
        <div style={{fontSize:14,color:loading?t.tx3:C.primary,fontWeight:700,cursor:"pointer"}}
          onClick={async()=>{
            if(loading)return;
            setLoading(true);
            await onSave({display_name:displayName,bio,avatar});
            setLoading(false);
          }}>{loading?"저장 중...":"완료"}</div>
      </div>

      {/* 아바타 선택 */}
      <div style={{padding:"28px 20px 20px",textAlign:"center",borderBottom:`1px solid ${t.bd}`}}>
        <div style={{width:80,height:80,borderRadius:"50%",
          background:`linear-gradient(145deg,${GR[1][0]},${GR[6][1]})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:36,margin:"0 auto 16px",border:`3px solid ${C.primary}`}}>
          {avatars[parseInt(avatar)||0]}
        </div>
        <div style={{fontSize:13,color:t.tx2,marginBottom:16}}>프로필 이미지 선택</div>
        <div style={{display:"flex",justifyContent:"center",gap:12}}>
          {avatars.map((a,i)=>(
            <div key={i} style={{width:52,height:52,borderRadius:"50%",
              background:`linear-gradient(145deg,${GR[i][0]},${GR[(i+2)%8][1]})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:24,cursor:"pointer",
              border:`2px solid ${String(i)===avatar?C.primary:t.bd}`,
              transform:String(i)===avatar?"scale(1.15)":"scale(1)",
              transition:"all 0.15s"}}
              onClick={()=>setAvatar(String(i))}>
              {a}
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:t.tx3,marginTop:12}}>사진 직접 업로드 — 준비 중이에요</div>
      </div>

      {/* 닉네임 */}
      <div style={{padding:"20px 20px 0"}}>
        <div style={{fontSize:12,color:t.tx3,marginBottom:8,fontWeight:600,letterSpacing:.05,textTransform:"uppercase"}}>닉네임</div>
        <input style={{...inputStyle(t),marginBottom:6}} value={displayName}
          onChange={e=>setDisplayName(e.target.value)} placeholder="닉네임"/>
        <div style={{fontSize:11,color:t.tx3,marginBottom:20}}>다른 사람들에게 보이는 이름이에요</div>

        <div style={{fontSize:12,color:t.tx3,marginBottom:8,fontWeight:600,letterSpacing:.05,textTransform:"uppercase"}}>한 줄 소개</div>
        <textarea style={{...inputStyle(t),resize:"none",height:90,lineHeight:1.55,marginBottom:6}}
          value={bio} onChange={e=>setBio(e.target.value)}
          placeholder="음악을 사랑하는 사람"/>
        <div style={{fontSize:11,color:t.tx3}}>{bio.length}/80자</div>
      </div>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────
function SettingsScreen({t,dark,setDark,onBack,onSub,onLanding,onLogout,profile,onEditProfile}){
  const sections=[
    {title:"계정",items:[
      {i:"◎",l:"프로필 편집",action:onEditProfile},
      {i:"🔒",l:"비밀번호 변경",action:()=>alert("이메일로 비밀번호 재설정 링크를 보내드릴게요 (준비중)")},
      {i:"📧",l:"이메일 변경",action:()=>alert("준비 중이에요")},
    ]},
    {title:"프라이버시",items:[
      {i:"🔑",l:"계정 공개/비공개",action:()=>alert("준비 중이에요")},
      {i:"🚫",l:"차단 목록",action:()=>alert("차단한 사용자가 없어요")},
    ]},
    {title:"알림",items:[
      {i:"🔔",l:"알림 설정",action:()=>alert("준비 중이에요")},
    ]},
    {title:"데이터",items:[
      {i:"⟳",l:"데이터 내보내기",action:()=>alert("준비 중이에요")},
      {i:"🗑",l:"기록 전체 삭제",danger:true,action:()=>{if(confirm("정말 모든 기록을 삭제할까요?"))alert("준비 중이에요")}},
    ]},
  ];
  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{padding:"52px 20px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:`1px solid ${t.bd}`}}>
        <IconBtn icon="‹" t={t} onClick={onBack}/>
        <div style={{fontSize:24,fontWeight:800,letterSpacing:-.5,color:t.tx}}>설정</div>
      </div>
      {profile&&(
        <div style={{display:"flex",gap:14,alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}} onClick={onEditProfile}>
          <div style={{width:48,height:48,borderRadius:"50%",background:bg(1),display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🎵</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:t.tx}}>{profile.display_name||profile.username}</div>
            <div style={{fontSize:12,color:t.tx2,marginTop:2}}>프로필 편집 →</div>
          </div>
        </div>
      )}
      <div style={{margin:"16px 20px",background:dark?"#0D0D1A":"#F3EEFF",border:`1px solid ${C.primary}30`,borderRadius:16,padding:"18px",cursor:"pointer"}} onClick={onSub}>
        <div style={{fontSize:11,letterSpacing:.15,textTransform:"uppercase",color:C.primary,fontWeight:700,marginBottom:4}}>✦ Pro 멤버십</div>
        <div style={{fontSize:13,fontWeight:600,color:t.tx}}>{CONFIG.pricing.monthly} · 무제한 기록 · 광고 없음 →</div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${t.bd}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:t.sf,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{dark?"☾":"☀"}</div>
          <span style={{fontSize:15,color:t.tx,fontWeight:500}}>{dark?"다크 모드":"라이트 모드"}</span>
        </div>
        <Toggle on={dark} onToggle={()=>setDark(!dark)} t={t}/>
      </div>
      {sections.map(sec=>(
        <div key={sec.title} style={{marginTop:24}}>
          <div style={{fontSize:12,letterSpacing:.1,textTransform:"uppercase",color:t.tx3,padding:"0 20px",marginBottom:4,fontWeight:600}}>{sec.title}</div>
          <div style={{background:t.sf,borderRadius:16,margin:"0 20px",overflow:"hidden",border:`1px solid ${t.bd}`}}>
            {sec.items.map((item,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<sec.items.length-1?`1px solid ${t.bd}`:"none",cursor:"pointer"}} onClick={item.action}>
                <div style={{width:30,height:30,borderRadius:8,background:item.danger?`${C.red}15`:t.sf2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:item.danger?C.red:t.tx,flexShrink:0}}>{item.i}</div>
                <span style={{fontSize:14,color:item.danger?C.red:t.tx,flex:1,fontWeight:400}}>{item.l}</span>
                {!item.danger&&<span style={{color:t.tx3,fontSize:16}}>›</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{margin:"28px 20px 0",background:t.sf,border:`1px solid ${t.bd}`,color:C.red,padding:"13px",borderRadius:12,textAlign:"center",fontSize:14,cursor:"pointer",fontWeight:600}} onClick={onLogout}>로그아웃</div>
      <div style={{padding:"16px 20px",textAlign:"center",cursor:"pointer"}} onClick={onLanding}>
        <span style={{fontSize:13,color:C.primary}}>{CONFIG.service.name} 서비스 소개 페이지 →</span>
      </div>
      <div style={{padding:"6px 20px",textAlign:"center"}}><span style={{fontSize:11,color:t.tx3}}>{CONFIG.service.name} v{CONFIG.service.version}</span></div>
    </div>
  );
}

// ── SUBSCRIPTION ──────────────────────────────────────────────
function SubScreen({t,dark,onBack,onComingSoon}){
  const [period,setPeriod]=useState("yearly");
  const [plan,setPlan]=useState("pro");
  const [pay,setPay]=useState("toss");
  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{padding:"52px 20px 24px",display:"flex",alignItems:"center",gap:14}}>
        <IconBtn icon="‹" t={t} onClick={onBack}/>
        <div style={{fontSize:24,fontWeight:800,letterSpacing:-.5,color:t.tx}}>멤버십</div>
      </div>

      {/* 준비중 배너 */}
      <div style={{margin:"0 20px 20px",background:`${C.primary}12`,border:`1px solid ${C.primary}30`,borderRadius:14,padding:"14px 16px",display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:20}}>🎵</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.primary}}>결제 기능 오픈 준비 중</div>
          <div style={{fontSize:12,color:t.tx2,marginTop:2}}>곧 만나요! 지금은 플랜을 미리 살펴보세요</div>
        </div>
      </div>

      <div style={{display:"flex",margin:"0 20px 20px",background:t.sf,borderRadius:14,padding:4,border:`1px solid ${t.bd}`}}>
        {[["monthly","월간"],["yearly","연간 — "+CONFIG.pricing.yearlySaving]].map(([id,label])=>(
          <div key={id} style={{flex:1,textAlign:"center",padding:"10px",borderRadius:11,background:period===id?t.bg:"transparent",fontSize:13,fontWeight:period===id?700:400,color:period===id?t.tx:t.tx2,cursor:"pointer",border:period===id?`1px solid ${t.bd}`:"1px solid transparent"}} onClick={()=>setPeriod(id)}>{label}</div>
        ))}
      </div>

      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {[
          {id:"free",name:"Free",pm:"무료",py:"무료",feats:CONFIG.pricing.freePlanFeatures},
          {id:"pro",name:"Pro",pm:CONFIG.pricing.monthly,py:CONFIG.pricing.yearly,sub:CONFIG.pricing.yearlyMonthly,feats:CONFIG.pricing.proPlanFeatures}
        ].map(p=>(
          <div key={p.id} onClick={()=>setPlan(p.id)} style={{border:`2px solid ${plan===p.id?(p.id==="pro"?C.primary:t.ac):t.bd}`,borderRadius:18,padding:"22px",cursor:"pointer",background:plan===p.id&&p.id==="pro"?dark?"#0D0D1A":"#F3EEFF":t.sf}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:p.id==="pro"?C.primary:t.tx,letterSpacing:-.3}}>{p.id==="pro"?"✦ ":""}{p.name}</div>
                {p.id==="pro"&&period==="yearly"&&<div style={{fontSize:11,color:t.tx3,marginTop:2}}>{p.sub} × 12개월</div>}
              </div>
              <div style={{fontSize:18,fontWeight:800,color:t.tx}}>{period==="monthly"?p.pm:p.py}</div>
            </div>
            {p.feats.map((f,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:7,fontSize:13,color:t.tx2}}>
                <span style={{color:p.id==="pro"?C.primary:C.green,fontWeight:700,fontSize:14}}>✓</span>{f}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{padding:"0 20px",marginBottom:20}}>
        <div style={{fontSize:12,letterSpacing:.1,textTransform:"uppercase",color:t.tx3,marginBottom:10,fontWeight:600}}>결제 수단 (준비중)</div>
        <div style={{background:t.sf,border:`1px solid ${t.bd}`,borderRadius:16,overflow:"hidden",opacity:0.5}}>
          {[["toss","📱","토스페이"],["kakao","💛","카카오페이"],["naver","🟢","네이버페이"],["card","💳","신용/체크카드"]].map(([id,icon,label],i)=>(
            <div key={id} style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",borderBottom:i<3?`1px solid ${t.bd}`:"none"}}>
              <span style={{fontSize:20}}>{icon}</span>
              <span style={{fontSize:14,flex:1,color:t.tx}}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"0 20px"}}>
        <div style={{background:t.sf3,color:t.tx2,padding:"16px",borderRadius:14,textAlign:"center",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:14}}
          onClick={()=>onComingSoon()}>
          {plan==="pro"?"결제 기능 오픈 예정":"Free로 계속하기"}
        </div>
        <div style={{fontSize:11,color:t.tx3,textAlign:"center",lineHeight:1.8}}>오픈 시 알림을 받고 싶으시면 이메일을 남겨주세요</div>
      </div>
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────
function RecordModal({t,track,existing,onClose,onSave}){
  const [rating,setRating]=useState(existing?.rating||0);
  const [memo,setMemo]=useState(existing?.memo||"");
  const [date,setDate]=useState(existing?.date||"");
  const [isPublic,setIsPublic]=useState(existing?.isPublic||false);
  return(
    <div style={{position:"fixed",inset:0,background:t.bg,zIndex:200,overflowY:"auto"}}>
      <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",padding:"0 0 40px"}}>
        {/* 헤더 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"52px 20px 20px"}}>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-.3,color:t.tx}}>{existing?"기록 수정":"기록하기"}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {existing&&<span style={{fontSize:12,color:C.red,cursor:"pointer",padding:"7px 14px",border:`1px solid ${C.red}30`,borderRadius:10}}>삭제</span>}
            <div onClick={onClose} style={{width:36,height:36,borderRadius:"50%",background:t.sf,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:t.tx2}}>✕</div>
          </div>
        </div>

        {/* 곡 정보 — 앨범 자켓 포함 */}
        <div style={{margin:"0 20px 28px",display:"flex",gap:16,alignItems:"center",padding:"16px",background:t.sf,borderRadius:18,border:`1px solid ${t.bd}`}}>
          {track?.coverUrl
            ?<div style={{width:72,height:72,borderRadius:12,overflow:"hidden",flexShrink:0}}>
               <img src={track.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
             </div>
            :<Cover g={track?.g||0} size={72} r={12}/>}
          <div style={{minWidth:0}}>
            <div style={{fontSize:16,fontWeight:700,color:t.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{track?.t||"곡 제목"}</div>
            <div style={{fontSize:13,color:t.tx2,marginTop:3}}>{track?.ar}</div>
            {track?.al&&<div style={{fontSize:12,color:t.tx3,marginTop:2}}>{track.al}</div>}
          </div>
        </div>

        {/* 별점 */}
        <div style={{padding:"0 20px 24px"}}>
          <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:14}}>별점</div>
          <div style={{display:"flex",gap:8}}>
            {[1,2,3,4,5].map(s=>(
              <span key={s} style={{fontSize:40,cursor:"pointer",color:s<=rating?C.gold:t.bd,transition:"color 0.1s"}} onClick={()=>setRating(s)}>★</span>
            ))}
          </div>
        </div>

        {/* 처음 들은 날 */}
        <div style={{padding:"0 20px 20px"}}>
          <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:10}}>처음 들은 날</div>
          <input style={inputStyle(t)} value={date} onChange={e=>setDate(e.target.value)} placeholder="예: 2019년 여름, 고등학교 때"/>
        </div>

        {/* 감상 메모 */}
        <div style={{padding:"0 20px 8px"}}>
          <div style={{fontSize:13,fontWeight:600,color:t.tx2,marginBottom:10}}>감상</div>
          <textarea style={{width:"100%",background:t.sf,border:`1px solid ${t.bd}`,borderRadius:14,padding:"16px",color:t.tx,fontSize:14,resize:"none",lineHeight:1.65,fontFamily:"inherit",minHeight:140}} value={memo} onChange={e=>setMemo(e.target.value.slice(0,500))} placeholder="이 곡에 대한 기억이나 감상을 남겨보세요"/>
          <div style={{textAlign:"right",fontSize:11,color:t.tx3,marginTop:6}}>{memo.length}/500</div>
        </div>

        {/* 피드 공개 */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",margin:"8px 20px",background:t.sf,borderRadius:14,border:`1px solid ${t.bd}`}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:t.tx}}>피드에 공개</div>
            <div style={{fontSize:12,color:t.tx3,marginTop:2}}>다른 사람들이 볼 수 있어요</div>
          </div>
          <Toggle on={isPublic} onToggle={()=>setIsPublic(!isPublic)} t={t}/>
        </div>

        {/* 저장 버튼 */}
        <div style={{padding:"20px 20px 0"}}>
          <div style={{background:C.primary,color:"#fff",padding:"16px",borderRadius:14,textAlign:"center",fontSize:15,fontWeight:700,cursor:"pointer"}} onClick={()=>{onSave({rating,memo,date,isPublic});onClose();}}>저장하기</div>
        </div>
      </div>
    </div>
  );
}

function ListModal({t,track,lists,trackLists,onClose,onSave}){
  const current=trackLists[track?.id]||[];
  const [selected,setSelected]=useState(current);
  const [creating,setCreating]=useState(false);
  const [newName,setNewName]=useState("");
  const toggle=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:t.sf,borderRadius:"22px 22px 0 0",padding:"0 20px 44px",width:"100%",maxWidth:390,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:t.bd,borderRadius:2,margin:"12px auto 18px"}}/>
        <div style={{fontSize:20,fontWeight:800,letterSpacing:-.3,marginBottom:4,color:t.tx}}>리스트에 담기</div>
        <div style={{fontSize:13,color:t.tx2,marginBottom:20}}>{track?.t} — {track?.ar}</div>
        {creating?(
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input autoFocus style={inputStyle(t)} placeholder="리스트 이름" value={newName} onChange={e=>setNewName(e.target.value)}/>
            <div style={{background:C.primary,color:"#fff",padding:"12px 16px",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}} onClick={()=>{if(newName.trim()){setCreating(false);setNewName("");}}}>완료</div>
          </div>
        ):(
          <div style={{display:"flex",gap:10,alignItems:"center",padding:"13px 14px",background:t.bg,borderRadius:14,marginBottom:14,cursor:"pointer",border:`1px dashed ${t.bd}`}} onClick={()=>setCreating(true)}>
            <span style={{fontSize:22,color:C.primary,lineHeight:1}}>+</span>
            <span style={{fontSize:14,color:t.tx2}}>새 리스트 만들기</span>
          </div>
        )}
        {lists.map(l=>{
          const sel=selected.includes(l.id);
          return(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,cursor:"pointer",border:`2px solid ${sel?C.primary:t.bd}`,background:sel?`${C.primary}0a`:t.bg,marginBottom:10}} onClick={()=>toggle(l.id)}>
              <div style={{width:48,height:48,borderRadius:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden",flexShrink:0}}>
                {l.gs.map((g,j)=><div key={j} style={{background:bg(g)}}/>)}
              </div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.tx}}>{l.name}</div><div style={{fontSize:12,color:t.tx2}}>{l.count}곡</div></div>
              <div style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${sel?C.primary:t.bd}`,background:sel?C.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {sel&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
              </div>
            </div>
          );
        })}
        <div style={{background:C.primary,color:"#fff",padding:"15px",borderRadius:14,textAlign:"center",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:8}} onClick={()=>{onSave(track?.id,selected);onClose();}}>
          저장 {selected.length>0?`(${selected.length}개 리스트)`:""}
        </div>
      </div>
    </div>
  );
}

// ── 장르 상세 페이지 (Apple Music 스타일) ─────────────────────
function GenreScreen({t,genreName,genreChartKey,onBack,onTrack}){
  const [tracks,setTracks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [coverUrl,setCoverUrl]=useState("");

  useEffect(()=>{
    setLoading(true);
    getChart(genreChartKey||"global", 50).then(d=>{
      setTracks(d);
      const first=d.find(tr=>tr.coverUrl);
      if(first) setCoverUrl(first.coverUrl);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[genreChartKey]);

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{position:"relative",height:200,overflow:"hidden",flexShrink:0}}>
        {coverUrl
          ?<img src={coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
          :<div style={{width:"100%",height:"100%",background:`linear-gradient(145deg,#1a1a2e,#16213e)`}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.65) 100%)"}}/>
        <div style={{position:"absolute",top:52,left:20}}><IconBtn icon="‹" t={{...t,sf:"rgba(255,255,255,0.2)"}} onClick={onBack}/></div>
        <div style={{position:"absolute",bottom:20,left:20,right:20}}>
          <div style={{fontSize:32,fontWeight:800,color:"#fff",letterSpacing:-.8}}>{genreName}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:4}}>{tracks.length > 0 ? `${tracks.length}곡` : ""}</div>
        </div>
      </div>
      {loading&&<div style={{padding:"48px 20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>}
      {tracks.map((tr,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}} onClick={()=>onTrack(tr)}>
          <div style={{width:50,height:50,borderRadius:10,flexShrink:0,overflow:"hidden",background:tr.coverUrl?"#111":bg(i%8)}}>
            {tr.coverUrl
              ?<img src={tr.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"rgba(255,255,255,0.3)"}}>♪</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{tr.t}</div>
            <div style={{fontSize:12,color:t.tx2,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{tr.ar}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 전체보기 화면 ─────────────────────────────────────────────
function SeeAllScreen({t,title,items,onBack,onTrack,query}){
  const [tracks,setTracks]=useState(items||[]);
  const [loading,setLoading]=useState(!!query);

  useEffect(()=>{
    if(!query) return;
    setLoading(true);
    const load=async()=>{
      try{
        // query가 chart key면 Spotify 차트, 아니면 검색
        const chartKeys=["global","kr","pop","kpop","indie","hiphop","rnb","jazz","dance","jpop","ost","classic"];
        if(chartKeys.includes(query)){
          const d=await getChart(query, 50);
          setTracks(d);
        } else {
          const [r1,r2]=await Promise.all([
            searchMusic(query,"KR"),
            searchMusic(query,"US"),
          ]);
          const all=[]; const seen=new Set();
          [r1,r2].forEach(d=>(d.tracks||[]).forEach(tr=>{
            const key=`${tr.t}-${tr.ar}`;
            if(!seen.has(key)){seen.add(key);all.push(tr);}
          }));
          setTracks(all.slice(0,100));
        }
      }catch(e){console.error(e);}
      setLoading(false);
    };
    load();
  },[]);

  return(
    <div style={{minHeight:"100vh",background:t.bg,paddingBottom:40}}>
      <div style={{padding:"52px 20px 16px",display:"flex",alignItems:"center",gap:14,borderBottom:`1px solid ${t.bd}`}}>
        <IconBtn icon="‹" t={t} onClick={onBack}/>
        <div style={{fontSize:22,fontWeight:800,letterSpacing:-.5,color:t.tx}}>{title}</div>
      </div>
      {loading&&<div style={{padding:"48px 20px",textAlign:"center",color:t.tx3,fontSize:13}}>불러오는 중...</div>}
      <div style={{padding:"8px 0"}}>
        {tracks.map((tr,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",borderBottom:`1px solid ${t.bd}`,cursor:"pointer"}} onClick={()=>onTrack(tr)}>
            <span style={{fontSize:14,fontWeight:700,color:i<3?C.primary:t.tx3,width:26,flexShrink:0,textAlign:"right"}}>{i+1}</span>
            <div style={{width:48,height:48,borderRadius:10,flexShrink:0,overflow:"hidden",background:tr.coverUrl?"#111":bg(i%8)}}>
              {tr.coverUrl?<img src={tr.coverUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"rgba(255,255,255,0.3)"}}>♪</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.tx,textAlign:"left"}}>{tr.t||""}</div>
              <div style={{fontSize:12,color:t.tx2,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"left"}}>{tr.ar||""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function BottomNav({t,nav,setNav}){
  return(
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480,
      background:`${t.bg}f8`, backdropFilter:"blur(20px)",
      borderTop:`1px solid ${t.bd}`,
      display:"flex", justifyContent:"space-around",
      padding:"10px 0 max(env(safe-area-inset-bottom),20px)",
      zIndex:1000,
    }}>
      {[{id:"home",icon:"⊞",label:"홈"},{id:"feed",icon:"◈",label:"피드"},{id:"search",icon:"○",label:"탐색"},{id:"archive",icon:"◉",label:"보관함"},{id:"profile",icon:"◎",label:"프로필"}].map(item=>(
        <div key={item.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",padding:"4px 14px",minWidth:0,flex:1}} onClick={()=>setNav(item.id)}>
          <span style={{fontSize:21,opacity:nav===item.id?1:0.3,transition:"opacity 0.18s",color:nav===item.id?C.primary:t.tx}}>{item.icon}</span>
          <span style={{fontSize:10,color:nav===item.id?C.primary:t.tx2,fontWeight:nav===item.id?700:400,whiteSpace:"nowrap"}}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App(){
  const [dark,setDark]=useState(false);
  const [page,setPage]=useState("landing");
  const [nav,setNav]=useState("home");
  const [modal,setModal]=useState(null);
  const [comingSoon,setComingSoon]=useState(null);
  const [selTrack,setSelTrack]=useState(null);
  const [selAlbum,setSelAlbum]=useState(null);
  const [viewUser,setViewUser]=useState({uid:"",username:""});
  const [showNotif,setShowNotif]=useState(false);
  const [seeAll,setSeeAll]=useState(null);
  const [genre,setGenre]=useState(null); // {name, query}
  const [currentUser,setCurrentUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [records,setRecords]=useState({});
  const [lists,setLists]=useState([]);
  const [trackLists,setTrackLists]=useState({});
  const [feedItems,setFeedItems]=useState([]);
  const t=THEME(dark);
  const hasNotif=NOTIFS.some(n=>!n.read);

  useEffect(()=>{
    getUser().then(user=>{
      if(user){ setCurrentUser(user); setPage("app"); loadUserData(user.id); }
    });
    getPublicFeed().then(feed=>{
      if(feed.length>0) setFeedItems(feed.map(r=>({
        id:r.id, user:r.profiles?.username||"익명", uid:r.user_id,
        track:r.track_title, artist:r.artist, g:Math.floor(Math.random()*8),
        rating:r.rating, memo:r.memo, likes:0, time:"방금 전", coverUrl:r.cover_url,
      })));
    }).catch(()=>{});
  },[]);

  const loadUserData = async (userId) => {
    try {
      const [prof, myRecords, myLists] = await Promise.all([
        getProfile(userId),
        getMyRecords(userId),
        getMyLists(userId),
      ]);
      if(prof) setProfile(prof);
      const recMap={};
      myRecords.forEach(r=>{
        recMap[r.track_id]={rating:r.rating,memo:r.memo,date:r.listened_date,isPublic:r.is_public,recordId:r.id,coverUrl:r.cover_url,track_title:r.track_title,artist:r.artist};
      });
      setRecords(recMap);
      if(myLists.length>=0) setLists(myLists);
    } catch(e){ console.error(e); }
  };

  const goApp=()=>{setPage("app");setNav("home");if(currentUser)loadUserData(currentUser.id);};
  const goTrack=tr=>{setSelTrack(tr);setPage("track");};
  const goAlbum=al=>{setSelAlbum(al);setPage("album");};
  const goUser=(uid,username)=>{setViewUser({uid,username});setPage("user");};
  const showComingSoon=(title,message)=>setComingSoon({title,message});
  const goSeeAll=(type,title,items,query)=>setSeeAll({type,title,items,query});
  const goGenre=(name,chartKey)=>setGenre({name,chartKey});

  const handleLogin=async()=>{
    const user=await getUser();
    if(user){setCurrentUser(user);await loadUserData(user.id);}
    goApp();
  };
  const handleSaveRecord=async(data)=>{
    if(!selTrack)return;
    const trackId=String(selTrack.id||selTrack.itunesId||'');
    if(currentUser){
      try{await saveRecord(currentUser.id,selTrack,data);await loadUserData(currentUser.id);}
      catch(e){console.error(e);}
    } else {setRecords(p=>({...p,[trackId]:data}));}
  };
  const handleSaveList=async(trackId,listIds)=>{
    if(currentUser&&selTrack){
      try{await saveListAssignment(currentUser.id,trackId,selTrack,listIds,lists);await loadUserData(currentUser.id);}
      catch(e){console.error(e);}
    }
    setTrackLists(p=>({...p,[trackId]:listIds}));
  };
  const handleCreateList=async(name)=>{
    if(currentUser){
      try{await createList(currentUser.id,name);await loadUserData(currentUser.id);}
      catch(e){console.error(e);}
    }
  };
  const handleLogout=async()=>{
    await signOut();setCurrentUser(null);setProfile(null);setRecords({});setLists([]);setPage("landing");
  };

  return(
    <>
      <style>{`
        ${CONFIG.fonts.import}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${t.bg};}
        body{font-family:${CONFIG.fonts.family};}
        ::-webkit-scrollbar{display:none;}
        input,textarea{outline:none;border:none;font-family:${CONFIG.fonts.family};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .app-wrap{width:100%;max-width:480px;min-height:100vh;margin:0 auto;position:relative;}
        @media(min-width:520px){.app-wrap{box-shadow:0 0 80px rgba(0,0,0,0.15);}}
      `}</style>
      <div className="app-wrap" style={{background:t.bg,color:t.tx,fontFamily:CONFIG.fonts.family,transition:"background 0.25s,color 0.25s"}}>
        {genre&&(
          <div style={{position:"fixed",inset:0,zIndex:500,background:t.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{flex:1,overflowY:"auto",paddingBottom:76}}>
              <GenreScreen t={t} genreName={genre.name} genreChartKey={genre.chartKey} onBack={()=>setGenre(null)} onTrack={tr=>{setGenre(null);goTrack(tr);}}/>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:600}}>
              <BottomNav t={t} nav={nav} setNav={v=>{setGenre(null);setNav(v);setPage("app");}}/>
            </div>
          </div>
        )}
        {seeAll&&(
          <div style={{position:"fixed",inset:0,zIndex:500,background:t.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{flex:1,overflowY:"auto",paddingBottom:76}}>
              <SeeAllScreen t={t} title={seeAll.title} items={seeAll.items} query={seeAll.query} onBack={()=>setSeeAll(null)} onTrack={tr=>{setSeeAll(null);goTrack(tr);}}/>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:600}}>
              <BottomNav t={t} nav={nav} setNav={v=>{setSeeAll(null);setNav(v);setPage("app");}}/>
            </div>
          </div>
        )}        {page==="landing"&&<LandingScreen t={t} dark={dark} setDark={setDark} onLogin={()=>setPage("login")} onSignup={()=>setPage("login")}/>}
        {page==="login"&&<LoginScreen t={t} dark={dark} setDark={setDark} onLogin={handleLogin} onBack={()=>setPage("landing")}/>}
        {page==="app"&&(
          <>
            <div style={{paddingBottom:76,animation:"fadeUp 0.2s ease",minHeight:"100vh"}}>
              {nav==="home"&&<HomeScreen t={t} dark={dark} setDark={setDark} onTrack={goTrack} onAlbum={goAlbum} onSub={()=>setPage("sub")} records={records} onNotif={()=>setShowNotif(!showNotif)} hasNotif={hasNotif} onSeeAll={goSeeAll}/>}
              {nav==="feed"&&<FeedScreen t={t} onTrack={goTrack} onUser={goUser} onMore={tr=>{setSelTrack(tr);setModal("more");}} feedItems={feedItems}/>}
              {nav==="search"&&<SearchScreen t={t} onTrack={goTrack} onAlbum={goAlbum} records={records} onSeeAll={goSeeAll} onGenre={goGenre}/>}
              {nav==="archive"&&<ArchiveScreen t={t} onTrack={goTrack} records={records} lists={lists} trackLists={trackLists} onCreateList={handleCreateList}/>}
              {nav==="profile"&&<MyProfileScreen t={t} dark={dark} setDark={setDark} onSettings={()=>setPage("settings")} onSub={()=>setPage("sub")} records={records} lists={lists} onTrack={goTrack} onReport={()=>setPage("report")} profile={profile}/>}
            </div>
            <BottomNav t={t} nav={nav} setNav={setNav}/>
            {showNotif&&<NotifPanel t={t} onClose={()=>setShowNotif(false)}/>}
          </>
        )}
        {page==="track"&&<TrackScreen t={t} track={selTrack} onBack={()=>setPage("app")} onRecord={tr=>{setSelTrack(tr);setModal("record");}} onListModal={tr=>{setSelTrack(tr);setModal("list");}} onMore={tr=>{setSelTrack(tr);setModal("more");}} onAlbum={goAlbum} onSimilar={tr=>{setSelTrack(tr);window.scrollTo(0,0);}} records={records} trackLists={trackLists} lists={lists}/>}
        {page==="album"&&<AlbumScreen t={t} album={selAlbum} onBack={()=>setPage("app")} onTrack={goTrack} records={records}/>}
        {page==="user"&&<UserProfileScreen t={t} uid={viewUser.uid} username={viewUser.username} onBack={()=>setPage("app")}/>}
        {page==="settings"&&<SettingsScreen t={t} dark={dark} setDark={setDark} onBack={()=>setPage("app")} onSub={()=>setPage("sub")} onLanding={()=>setPage("landing")} onLogout={handleLogout} profile={profile} onEditProfile={()=>setPage("editProfile")}/>}
        {page==="editProfile"&&<EditProfilePage t={t} profile={profile} currentUser={currentUser} onBack={()=>setPage("settings")} onSave={async(updates)=>{if(currentUser){await supabase.from('profiles').update(updates).eq('id',currentUser.id);await loadUserData(currentUser.id);}setPage("settings");}}/>}
        {page==="sub"&&<SubScreen t={t} dark={dark} onBack={()=>setPage("app")} onComingSoon={()=>showComingSoon("결제 기능 준비 중",CONFIG.comingSoon.payment)}/>}
        {page==="report"&&<AnnualReport t={t} onBack={()=>setPage("app")} records={records}/>}
        {modal==="record"&&<RecordModal t={t} track={selTrack} existing={selTrack?records[String(selTrack.id||selTrack.itunesId||'')]:null} onClose={()=>setModal(null)} onSave={handleSaveRecord}/>}
        {modal==="list"&&<ListModal t={t} track={selTrack} lists={lists} trackLists={trackLists} onClose={()=>setModal(null)} onSave={handleSaveList} onCreateList={handleCreateList}/>}
        {modal==="more"&&<MoreSheet t={t} track={selTrack} onClose={()=>setModal(null)} onListModal={tr=>{setModal(null);setSelTrack(tr);setTimeout(()=>setModal("list"),50);}}/>}
        {comingSoon&&<ComingSoonModal t={t} title={comingSoon.title} message={comingSoon.message} onClose={()=>setComingSoon(null)}/>}
      </div>
    </>
  );
}
