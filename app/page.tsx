"use client";
import {useEffect,useRef,useState} from "react";

type Train={number:string;name:string;type:string;departure:string;arrival:string;duration:string;distance:number|null;classCode:string;availability:string;fare:number|null;delayMinutes:number|null;platform:string|null};
type Data={from:{code:string;name:string};to:{code:string;name:string};date:string;count:number;trains:Train[];fetchedAt:string};

const today=new Date().toISOString().slice(0,10);
const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
const niceDate=(value:string)=>new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date(value+"T00:00:00"));
const availabilityTone=(value:string)=>/AVAILABLE/i.test(value)?"positive":/RAC/i.test(value)?"warning":/WL|WAIT/i.test(value)?"negative":"neutral";

export default function Home(){
 const[from,setFrom]=useState("NDLS"),[to,setTo]=useState("LKO"),[date,setDate]=useState(tomorrow);
 const[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const searched=useRef(false),abort=useRef<AbortController|null>(null);

 async function search(){
  if(!from.trim()||!to.trim()||!date)return;
  searched.current=true;abort.current?.abort();abort.current=new AbortController();
  setLoading(true);setError("");setData(null);
  try{
   const q=new URLSearchParams({from:from.trim(),to:to.trim(),date,_:String(Date.now())});
   const r=await fetch(`/api/trains?${q}`,{cache:"no-store",signal:abort.current.signal,headers:{"Cache-Control":"no-cache"}});
   const body=await r.json();if(!r.ok)throw new Error(body.error||"We couldn't load live trains right now.");setData(body);
  }catch(e){if((e as Error).name!=="AbortError")setError((e as Error).message)}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(!searched.current)return;const id=setTimeout(search,450);return()=>clearTimeout(id)},[date]);
 const swap=()=>{setFrom(to);setTo(from)};

 return <main>
  <header className="topbar">
   <a className="brand" href="#" aria-label="RailVista home"><span className="brandmark">R</span><span>RailVista<small>TRAVEL, SIMPLIFIED</small></span></a>
   <nav aria-label="Primary navigation"><a className="active" href="#search">Book trains</a><a href="#how">How it works</a><a href="#help">Help</a></nav>
   <div className="headerActions"><span className="liveDot"><i/> Live data</span><button className="avatar" aria-label="Account menu">KR</button></div>
  </header>

  <section className="hero">
   <div className="heroContent"><span className="eyebrow">INDIA, BETTER CONNECTED</span><h1>Your next journey,<br/><em>beautifully planned.</em></h1><p>Search date-specific trains with live seat availability, fare and running information—all in one calm experience.</p><div className="trustRow"><span><b>✓</b> Fresh results</span><span><b>✓</b> Live availability</span><span><b>✓</b> Clear fares</span></div></div>
   <div className="heroVisual" aria-hidden="true"><div className="routeLine"><i/><i/><i/></div><span className="trainGlyph">→</span><div className="heroStat"><small>LIVE ROUTE</small><b>NDLS</b><i>to</i><b>LKO</b></div></div>
  </section>

  <section className="searchPanel" id="search" aria-label="Search trains">
   <div className="searchIntro"><span className="sectionIcon">⌕</span><div><small>PLAN YOUR JOURNEY</small><strong>Where would you like to go?</strong></div></div>
   <div className="searchGrid">
    <label><span>FROM STATION</span><div className="inputShell"><i>●</i><input value={from} onChange={e=>setFrom(e.target.value.toUpperCase())} placeholder="NDLS" aria-label="From station code"/></div><small>Use station code, e.g. NDLS</small></label>
    <button className="swap" onClick={swap} aria-label="Swap origin and destination">⇄</button>
    <label><span>TO STATION</span><div className="inputShell destination"><i>●</i><input value={to} onChange={e=>setTo(e.target.value.toUpperCase())} placeholder="LKO" aria-label="To station code"/></div><small>Use station code, e.g. LKO</small></label>
    <label><span>JOURNEY DATE</span><div className="inputShell"><i>◫</i><input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)} aria-label="Journey date"/></div><small>{niceDate(date)}</small></label>
    <button className="searchButton" disabled={loading||!from||!to||!date} onClick={search}><span>{loading?"Searching live trains":"Search live trains"}</span><b>{loading?<i className="spinner"/>:"→"}</b></button>
   </div>
   <div className="searchMeta"><span><i>1</i> Adult</span><span><i>GN</i> General quota</span><small>Availability is checked for one supported class per train.</small></div>
  </section>

  <section className="content" aria-live="polite">
   {!data&&!loading&&!error&&<div className="welcomeState" id="how">
    <div><span className="eyebrow dark">WHY RAILVISTA</span><h2>Less searching.<br/>More certainty.</h2><p>Real railway information, organized around the decisions that matter before you travel.</p></div>
    <div className="benefits"><article><span>01</span><div><h3>Date-specific routes</h3><p>Only trains scheduled to run on your selected journey date.</p></div></article><article><span>02</span><div><h3>Availability at a glance</h3><p>Available, RAC and waitlist status presented without clutter.</p></div></article><article><span>03</span><div><h3>Transparent pricing</h3><p>Current fare information alongside the relevant travel class.</p></div></article></div>
   </div>}

   {loading&&<div className="resultsWrap"><div className="resultsHeader"><div><span className="eyebrow dark">LIVE SEARCH</span><h2>Finding your best trains…</h2><p>Checking schedule, seat status and fares for {niceDate(date)}.</p></div><div className="pulseBadge"><i/> Contacting railway service</div></div><div className="skeletonList">{[1,2,3].map(n=><div className="skeletonCard" key={n}><i/><div><b/><span/></div><em/><strong/></div>)}</div></div>}

   {error&&<div className="stateCard errorState"><span className="stateIcon">!</span><div><small>LIVE SEARCH UNAVAILABLE</small><h2>We couldn’t complete that search.</h2><p>{error}</p><p className="hint">Check the station codes, wait a minute if you searched repeatedly, then try again.</p></div><button onClick={search}>Try again <b>→</b></button></div>}

   {data&&<div className="resultsWrap">
    <div className="resultsHeader"><div><span className="eyebrow dark">AVAILABLE JOURNEYS</span><h2>{data.from.name} <em>→</em> {data.to.name}</h2><p>{niceDate(data.date)} · {data.count} trains shown · General quota</p></div><div className="freshBadge"><i/> Updated {new Date(data.fetchedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</div></div>
    {data.trains.length===0?<div className="stateCard emptyState"><span className="stateIcon">⌁</span><div><small>NO DIRECT TRAINS FOUND</small><h2>Try another date or nearby station.</h2><p>No train was returned for this route on {niceDate(data.date)}.</p></div><button onClick={()=>{setData(null);document.getElementById("search")?.scrollIntoView({behavior:"smooth"})}}>Modify search <b>↑</b></button></div>:
    <div className="trainList">{data.trains.map((t,index)=><article className="trainCard" key={t.number+"-"+t.classCode}>
     <div className="trainTop"><div className="trainIdentity"><span className="trainIcon">↗</span><div><div className="trainLabels"><span>{t.type}</span>{index===0&&<b>EARLIEST</b>}</div><h3>{t.name}</h3><p>Train #{t.number}{t.platform?<> · Platform {t.platform}</>:null}</p></div></div><div className={`running ${t.delayMinutes&&t.delayMinutes>0?"late":""}`}><i/>{t.delayMinutes==null?"Running status unavailable":t.delayMinutes===0?"Running on time":`${t.delayMinutes} min delayed`}</div></div>
     <div className="journeyRow"><div className="timeBlock"><strong>{t.departure}</strong><span>{data.from.code}</span><small>{data.from.name}</small></div><div className="journeyLine"><span>{t.duration}</span><div><i/><hr/><b>›</b></div><small>{t.distance?`${t.distance} km`:"Direct journey"}</small></div><div className="timeBlock arrival"><strong>{t.arrival}</strong><span>{data.to.code}</span><small>{data.to.name}</small></div></div>
     <div className="trainBottom"><div className="classInfo"><span className="classPill">{t.classCode}</span><div><small>SEAT STATUS</small><b className={availabilityTone(t.availability)}>{t.availability}</b></div></div><div className="fare"><div><small>FARE PER ADULT</small><strong>{t.fare==null?"Unavailable":`₹${Number(t.fare).toLocaleString("en-IN")}`}</strong></div><span className="detailArrow" aria-hidden="true">→</span></div></div>
    </article>)}</div>}
   </div>}
  </section>

  <footer className="pageFooter" id="help"><div className="brand footerBrand"><span className="brandmark">R</span><span>RailVista<small>TRAVEL, SIMPLIFIED</small></span></div><div><strong>Plan with confidence.</strong><small>Live information can change. Verify important journey details before departure.</small></div><p>Independent travel experience<br/>Not affiliated with Indian Railways or IRCTC</p></footer>
 </main>
}
