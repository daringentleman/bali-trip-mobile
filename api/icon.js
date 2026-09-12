export default async function handler(req,res){
  try{
    const r=await fetch('https://qblautsduswdhwdcqsre.supabase.co/functions/v1/bali-app-icon?v=2');
    if(!r.ok) throw new Error(`icon upstream ${r.status}`);
    const b=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Content-Length',String(b.length));
    return res.status(200).send(b);
  }catch(e){
    return res.status(500).send('icon error');
  }
}
