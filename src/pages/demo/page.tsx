import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
type Demo = { id: string; company: string; expires_at: string };
const sections = ['Overview','Projects','Workforce','Procurement','CIS register','Deadlines'] as const;
type Section = typeof sections[number];
const projects = [
 {reference:'DEMO-001',name:'Riverside office refurbishment',status:'In progress',budget:185000,progress:65,description:'Internal fit-out, electrical upgrade and accessible reception works. Sample project manager: Alex Morgan.'},
 {reference:'DEMO-002',name:'Oak Avenue extension',status:'Planning',budget:72000,progress:15,description:'Single-storey extension with first-fix electrical and heating works. Sample project manager: Sam Ellis.'},
 {reference:'DEMO-003',name:'Market Square roof repairs',status:'Practical completion',budget:38000,progress:100,description:'Roof renewal and inspection records awaiting final close-out. Sample project manager: Alex Morgan.'},
];
const people = [
 {name:'Alex Morgan',trade:'Project manager',relationship:'Employee',status:'Sample documents reviewed'},
 {name:'Sam Ellis',trade:'Electrician',relationship:'Individual subcontractor',status:'Sample qualification expiring'},
 {name:'Jordan Reed',trade:'Carpenter',relationship:'Individual subcontractor',status:'Sample documents awaiting review'},
 {name:'Taylor Clarke',trade:'Site supervisor',relationship:'Employee',status:'Sample documents reviewed'},
 {name:'Casey Lane',trade:'Roofer',relationship:'Agency worker',status:'Sample induction required'},
];
const orders = [
 {reference:'PO-DEMO-001',supplier:'Sample Electrical Supplies',item:'Containment and distribution equipment',value:4800,status:'Part delivered'},
 {reference:'PO-DEMO-002',supplier:'Sample Timber Merchant',item:'Structural timber',value:2350,status:'Approved'},
 {reference:'PO-DEMO-003',supplier:'Sample Access Hire',item:'Tower hire · weekly rate',value:180,status:'On hire'},
];
function dateFromNow(days: number) { const d=new Date();d.setDate(d.getDate()+days);return d.toLocaleDateString('en-GB'); }
export default function DemoWorkspace() {
 const [demo,setDemo]=useState<Demo|null>(null);const [error,setError]=useState('');const [section,setSection]=useState<Section>('Overview');const [query,setQuery]=useState('');const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{ let active=true; let timer:ReturnType<typeof setTimeout>|undefined;
 async function open(){try{
  const token=new URLSearchParams(window.location.hash.slice(1)).get('token')||sessionStorage.getItem('bn_demo_token')||'';
  if(!/^[a-f0-9]{64}$/.test(token)) throw new Error('Use the private demo link sent to your email.');
  let session=sessionStorage.getItem('bn_demo_session');if(!session){session=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('bn_demo_session',session);}
  const response=await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-demo-email`,{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY},body:JSON.stringify({action:'redeem',token,session})});
  const result=await response.json();if(!response.ok) throw new Error(result.error||'Demo unavailable.');
  const remaining=Date.parse(result.expires_at)-Date.now();if(!Number.isFinite(remaining)||remaining<=0)throw new Error('Your demo has expired.');
  if(active){sessionStorage.setItem('bn_demo_token',token);window.history.replaceState(null,'',window.location.pathname);setDemo(result);timer=setTimeout(()=>{setDemo(null);setError('Your demo has expired. Request a new link from the homepage.');sessionStorage.removeItem('bn_demo_token');},remaining);}
 }catch(e){if(active)setError(e instanceof Error?e.message:'Could not open your demo.');}}
 void open();return()=>{active=false;if(timer)clearTimeout(timer);};},[]);
 function change(value:Section){setSection(value);setQuery('');setSelected(null);}
 const match=(text:string)=>text.toLowerCase().includes(query.toLowerCase());
 const project=projects.find(p=>p.reference===selected);
 return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="bg-slate-900 text-white p-6"><div className="mx-auto max-w-6xl flex justify-between gap-4 flex-wrap"><div><p className="font-bold text-2xl">BuildNerve · Sample workspace</p>{demo&&<p>{demo.company}</p>}</div><Link to="/" className="underline">Back to BuildNerve</Link></div></header><div className="mx-auto max-w-6xl p-6 space-y-6">{error?<p role="alert" className="rounded border p-6 bg-white">{error} <Link to="/#demo" className="underline">Request a demo link</Link></p>:!demo?<p role="status">Opening your private demo…</p>:<><aside className="rounded-lg bg-amber-50 border border-amber-200 p-4"><strong>Fictional sample data · read-only</strong><p>Explore and filter records. Payments, real emails, uploads, edits and HMRC submissions are disabled. This workspace is separate from customer accounts.</p><p className="text-sm">Expires {new Date(demo.expires_at).toLocaleString('en-GB')} · Demo reference {demo.id.slice(0,8)}</p></aside><nav className="flex flex-wrap gap-2" aria-label="Demo sections">{sections.map(item=><button key={item} onClick={()=>change(item)} aria-pressed={section===item} className={`rounded-lg px-4 py-2 border ${section===item?'bg-teal-700 text-white':'bg-white'}`}>{item}</button>)}</nav><h1 className="text-2xl font-bold">{section}</h1>{section==='Overview'?<><div className="grid gap-4 sm:grid-cols-3">{[['Projects',3],['Workforce records',5],['Open procurement records',3]].map(([label,value])=><div className="rounded-xl bg-white border p-6" key={label}><p className="text-sm">{label}</p><p className="text-3xl font-semibold">{value}</p></div>)}</div><p>Start with Projects to open a sample job, then inspect workforce, purchasing and deadline records using the tabs above.</p></>:<label className="block">Filter {section.toLowerCase()}<input className="block border rounded-lg p-3 w-full bg-white" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
 {section==='Projects'&&<>{projects.filter(p=>match(`${p.name} ${p.reference} ${p.status}`)).map(p=><article className="rounded-xl border bg-white p-5 space-y-2" key={p.reference}><h2 className="font-semibold">{p.reference} · {p.name}</h2><p>{p.status} · Sample budget £{p.budget.toLocaleString('en-GB')} · {p.progress}% complete</p><button className="underline" onClick={()=>setSelected(p.reference)}>Open sample project</button></article>)}{project&&<section className="rounded-xl bg-teal-50 border p-5 space-y-2" aria-label="Selected sample project"><h2 className="font-bold">{project.name}</h2><p>{project.description}</p><p>Sample next activity: site coordination meeting on {dateFromNow(2)}.</p><button className="underline" onClick={()=>setSelected(null)}>Close project detail</button></section>}</>}
 {section==='Workforce'&&people.filter(p=>match(Object.values(p).join(' '))).map(p=><article className="rounded-xl border bg-white p-5" key={p.name}><h2 className="font-semibold">{p.name}</h2><p>{p.trade} · {p.relationship}</p><p>{p.status}</p></article>)}
 {section==='Procurement'&&orders.filter(p=>match(Object.values(p).join(' '))).map(p=><article className="rounded-xl border bg-white p-5" key={p.reference}><h2 className="font-semibold">{p.reference} · {p.supplier}</h2><p>{p.item} · £{p.value.toLocaleString('en-GB')} · {p.status}</p></article>)}
 {section==='CIS register'&&<><p>Illustrative calculations only. No real tax identifiers or HMRC verification results are included.</p>{[{name:'Sam Ellis',labour:1200,materials:250,rate:20},{name:'Jordan Reed',labour:900,materials:180,rate:30}].filter(p=>match(p.name)).map(p=><article className="rounded-xl bg-white border p-5" key={p.name}><h2 className="font-semibold">{p.name}</h2><p>Sample labour £{p.labour} · Materials £{p.materials} · Illustrative deduction rate {p.rate}%</p><p>Deduction £{p.labour*p.rate/100} · Net £{p.labour+p.materials-p.labour*p.rate/100}</p><p>Not verified with HMRC</p></article>)}</>}
 {section==='Deadlines'&&[{title:'Riverside progress application review',days:3},{title:'Sam Ellis qualification review',days:7},{title:'Oak Avenue procurement approval',days:2},{title:'Market Square close-out pack',days:14}].filter(d=>match(d.title)).map(d=><article className="rounded-xl border bg-white p-5" key={d.title}><h2 className="font-semibold">{d.title}</h2><p>Sample target date: {dateFromNow(d.days)}</p></article>)}
 <footer className="border-t pt-5"><Link className="underline" to="/sign-up">Create your own BuildNerve account</Link><p className="text-sm">Your real account starts separately. Demo records are never copied into it.</p></footer></>}</div></main>;
}
