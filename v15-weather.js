(()=>{
  const SPOTS={
    '2026-09-13':{name:'庫塔 Kuta',lat:-8.7237,lon:115.1700,note:'抵達日｜午後注意短暫陣雨'},
    '2026-09-14':{name:'庫塔 Kuta',lat:-8.7237,lon:115.1700,note:'Waterbom｜高 UV，防曬要補擦'},
    '2026-09-15':{name:'巴杜爾火山 Batur',lat:-8.2422,lon:115.3750,note:'凌晨山區明顯較冷，薄外套要帶'},
    '2026-09-16':{name:'曼塔灣 Manta Bay',lat:-8.6800,lon:115.4550,note:'海況比陸地天氣更重要，當天再看業者通知'},
    '2026-09-17':{name:'烏布／Kuber',lat:-8.4300,lon:115.2600,note:'ATV 可能遇短暫雨，換洗衣物照帶'},
    '2026-09-18':{name:'烏魯瓦圖 Uluwatu',lat:-8.8291,lon:115.0849,note:'Beach Club＋夕陽｜午後仍要防曬'},
    '2026-09-19':{name:'烏魯瓦圖 Uluwatu',lat:-8.8291,lon:115.0849,note:'回程日｜出發前再看降雨與路況'}
  };
  const fallback={
    '2026-09-13':{max:32,min:24,rain:35,code:61,uv:11},
    '2026-09-14':{max:32,min:23,rain:25,code:3,uv:11},
    '2026-09-15':{max:25,min:16,rain:35,code:3,uv:10},
    '2026-09-16':{max:29,min:24,rain:35,code:2,uv:10},
    '2026-09-17':{max:29,min:22,rain:40,code:61,uv:10},
    '2026-09-18':{max:27,min:25,rain:30,code:2,uv:8},
    '2026-09-19':{max:27,min:25,rain:35,code:2,uv:8}
  };
  const cache=new Map();
  let lastDaily='';

  function icon(code){
    if(code===0)return '☀️';
    if([1,2].includes(code))return '🌤️';
    if(code===3)return '☁️';
    if([45,48].includes(code))return '🌫️';
    if(code>=51&&code<=67)return '🌦️';
    if(code>=71&&code<=77)return '🌨️';
    if(code>=80&&code<=82)return '🌧️';
    if(code>=95)return '⛈️';
    return '🌤️';
  }
  function label(code){
    if(code===0)return '晴';
    if([1,2].includes(code))return '晴時多雲';
    if(code===3)return '多雲';
    if([45,48].includes(code))return '有霧';
    if(code>=51&&code<=67)return '有陣雨';
    if(code>=71&&code<=77)return '降雪';
    if(code>=80&&code<=82)return '陣雨';
    if(code>=95)return '雷雨';
    return '天氣變化';
  }
  function advice(date,w){
    const base=SPOTS[date]?.note||'';
    if(w.rain>=60)return `降雨機率高｜${base}`;
    if(w.uv>=9)return `UV 很高｜${base}`;
    return base;
  }
  function ensureUI(){
    if(!document.getElementById('v15WeatherHome')){
      const next=document.querySelector('#home .nextbox');
      if(next){const el=document.createElement('div');el.id='v15WeatherHome';el.className='v15-weather-home v15-weather-loading';el.innerHTML='<div class="wx-main"><div class="wx-title">天氣</div><div class="wx-line">更新中…</div><div class="wx-note">以每天主要活動地點為準</div></div><div class="wx-temp">--°</div>';next.insertAdjacentElement('afterend',el)}
    }
    const dailyTop=document.querySelector('#daily .topbar');
    if(dailyTop&&!document.getElementById('v15DailyWeather')){
      const el=document.createElement('div');el.id='v15DailyWeather';el.className='v15-daily-weather v15-weather-loading';el.innerHTML='<div class="wx-top">天氣更新中…</div><div class="wx-sub">—</div>';dailyTop.appendChild(el)
    }
  }
  async function forecast(date){
    if(cache.has(date))return cache.get(date);
    const spot=SPOTS[date];if(!spot)return null;
    const fb={...fallback[date],date,spot};
    const saved=localStorage.getItem('wx_'+date);
    if(saved){try{const o=JSON.parse(saved);if(Date.now()-o.ts<30*60*1000){cache.set(date,o.data);return o.data}}catch(e){}}
    try{
      const q=new URLSearchParams({latitude:String(spot.lat),longitude:String(spot.lon),daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',timezone:'Asia/Makassar',forecast_days:'10'});
      const r=await fetch('https://api.open-meteo.com/v1/forecast?'+q.toString(),{cache:'no-store'});
      if(!r.ok)throw new Error('weather');
      const j=await r.json(),i=j.daily.time.indexOf(date);
      if(i<0)throw new Error('date');
      const data={date,spot,code:j.daily.weather_code[i],max:Math.round(j.daily.temperature_2m_max[i]),min:Math.round(j.daily.temperature_2m_min[i]),rain:Math.round(j.daily.precipitation_probability_max[i]||0),uv:Math.round(j.daily.uv_index_max[i]||0)};
      cache.set(date,data);localStorage.setItem('wx_'+date,JSON.stringify({ts:Date.now(),data}));return data;
    }catch(e){cache.set(date,fb);return fb}
  }
  async function renderHomeWeather(){
    ensureUI();
    let d=currentDay();if(!SPOTS[d])d='2026-09-13';
    const w=await forecast(d),el=document.getElementById('v15WeatherHome');if(!w||!el)return;
    el.classList.remove('v15-weather-loading');
    el.innerHTML=`<div class="wx-main"><div class="wx-title">${w.spot.name}｜${dayLabel(d)}天氣</div><div class="wx-line">${icon(w.code)} ${label(w.code)}・降雨 ${w.rain}%・UV ${w.uv}</div><div class="wx-note">${advice(d,w)}</div></div><div class="wx-temp">${w.max}°</div>`;
  }
  async function renderDailyWeather(){
    ensureUI();
    const d=selectedDay;if(!SPOTS[d])return;
    const w=await forecast(d),el=document.getElementById('v15DailyWeather');if(!w||!el)return;
    el.classList.remove('v15-weather-loading');
    el.innerHTML=`<div class="wx-top">${icon(w.code)} ${w.max}° / ${w.min}°・雨 ${w.rain}%</div><div class="wx-sub">${w.spot.name}｜${label(w.code)}</div>`;
  }
  function tick(){ensureUI();renderHomeWeather();if(selectedDay!==lastDaily){lastDaily=selectedDay;renderDailyWeather()}}
  const oldShow=window.showPage;
  window.showPage=function(id){const r=oldShow(id);setTimeout(()=>{ensureUI();if(id==='daily')renderDailyWeather();if(id==='home')renderHomeWeather()},0);return r};
  setInterval(tick,1200);
  tick();
})();
