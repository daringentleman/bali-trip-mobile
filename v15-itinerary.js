(()=>{
  const VERSION='bali_v15_time_logic';
  if(localStorage.getItem(VERSION)==='1') return;

  const patch={
    f1:{start:'09:10',end:'14:35',activity:'飛往峇里島｜TPE → DPS',place:'台北桃園機場 → 峇里島伍拉賴國際機場',travel:''},
    a1:{start:'15:30',end:'15:40',activity:'機場 → Discovery Kartika Plaza',place:'伍拉賴國際機場 DPS → Discovery Kartika Plaza｜實際車程通常約 7–10 分；尖峰抓 15 分',travel:'車程約 7–10 分；尖峰抓 15 分'},
    h1:{start:'15:40',end:'16:10',activity:'Discovery Kartika Plaza Check-in',place:'庫塔 Kuta｜辦理入住、進房放行李',travel:''},
    e13:{start:'18:30',end:'20:00',activity:'庫塔 Kuta｜晚餐＋散步'},
    s13:{start:'22:30',end:'23:00',activity:'回飯店休息'},

    b14:{start:'08:00',end:'08:40',activity:'飯店早餐'},
    w14:{start:'09:00',end:'15:30',activity:'Waterbom 水上樂園',place:'庫塔 Kuta｜Waterbom 水上樂園',travel:''},
    m14:{start:'16:30',end:'17:30',activity:'庫塔 Kuta｜按摩 / SPA'},
    d14:{start:'18:00',end:'19:30',activity:'庫塔 Kuta｜晚餐'},
    sl14:{start:'21:00',end:'21:30',activity:'回飯店早睡'},

    wake15:{start:'00:45',end:'01:15',activity:'起床＋準備巴杜爾火山',place:'庫塔 Kuta｜穿暖、拿相機、下樓準備上車'},
    p15:{start:'01:15',end:'03:15',activity:'Discovery 飯店 → 巴杜爾火山',place:'庫塔 Kuta → 巴杜爾火山 Mount Batur｜實際車程約 1.5–2 小時',travel:'車程約 1.5–2 小時'},
    bt15:{start:'04:00',end:'08:30',activity:'巴杜爾火山｜日出四驅 Jeep'},
    rb15:{start:'08:30',end:'10:30',activity:'巴杜爾火山 → Discovery 飯店',place:'巴杜爾火山 → 庫塔 Kuta｜實際車程約 1.5–2 小時',travel:'車程約 1.5–2 小時'},
    nap15:{start:'10:30',end:'16:00',activity:'回飯店｜洗澡＋補眠＋休息',place:'Discovery Kartika Plaza｜非交通時間'},
    din15:{start:'18:30',end:'20:00',activity:'庫塔 Kuta｜晚餐 / 輕鬆逛'},

    sn16:{start:'08:00',end:'14:35',activity:'曼塔灣 Manta Bay｜純浮潛',place:'藍夢島 / 曼塔灣 Manta Bay｜船程＋浮潛活動；實際節奏依業者當日安排',travel:''},
    u16:{start:'15:15',end:'16:30',activity:'沙努爾 Sanur → 烏布 Pondok',place:'沙努爾 Sanur → 烏布 Ubud｜實際車程約 1–1.25 小時',travel:'車程約 1–1.25 小時'},
    ph16:{start:'16:30',end:'17:00',activity:'Pondok Q Zarva Check-in',place:'烏布 Ubud｜辦理入住、放行李'},
    du16:{start:'18:00',end:'19:30',activity:'烏布 Ubud｜晚餐＋休息'},

    br17:{start:'08:30',end:'09:30',activity:'Pondok 早餐＋退房準備',place:'烏布 Ubud｜吃早餐、整理行李、交給包車司機'},
    car17:{start:'09:30',end:'10:20',activity:'Pondok → Kuber ATV',place:'烏布 Ubud → Kuber BALI ADVENTURE｜實際車程約 40–50 分',travel:'車程約 40–50 分'},
    kub17:{start:'11:30',end:'13:00',activity:'Kuber ATV｜兩人共乘'},
    wash17:{start:'13:00',end:'14:00',activity:'Kuber｜洗澡＋換衣＋午餐',place:'Kuber ATV｜非交通時間'},
    so17:{start:'14:00',end:'16:45',activity:'Kuber → Dolce x The Young Villas',place:'Payangan → 佩卡圖／烏魯瓦圖 Pecatu / Uluwatu｜實際車程約 2.25–3 小時',travel:'車程約 2.25–3 小時'},
    do17:{start:'16:45',end:'17:15',activity:'Dolce x The Young Villas Check-in',place:'佩卡圖／烏魯瓦圖 Pecatu / Uluwatu｜辦理入住、放行李'},

    bk18:{start:'09:00',end:'11:00',activity:'烏魯瓦圖｜自然醒＋Bakery',place:'烏魯瓦圖 Uluwatu'},
    bc18:{start:'14:00',end:'18:30',activity:'烏魯瓦圖｜Beach Club＋夕陽',place:'烏魯瓦圖 Uluwatu｜選定 Beach Club 後再校正接送車程'},

    bf19:{start:'09:00',end:'10:00',activity:'Villa 早餐',place:'Dolce x The Young Villas｜佩卡圖／烏魯瓦圖'},
    ap19:{start:'11:45',end:'12:45',activity:'Villa → 伍拉賴國際機場',place:'佩卡圖／烏魯瓦圖 → DPS｜實際車程約 45–60 分；交通尖峰另留備援',travel:'車程約 45–60 分'},
    fh19:{start:'15:55',end:'21:20',activity:'飛回台灣｜DPS → TPE'}
  };

  const additions=[
    {id:'arr13',date:'2026-09-13',start:'14:35',end:'15:30',activity:'DPS｜下機＋入境＋領行李＋找司機',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=I+Gusti+Ngurah+Rai+International+Airport',place:'伍拉賴國際機場｜這段是機場流程，不算車程',travel:''},
    {id:'walk14',date:'2026-09-14',start:'08:50',end:'09:00',activity:'Discovery → Waterbom',kind:'transport',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Waterbom+Bali',place:'飯店步行 → Waterbom｜實際步行約 4–6 分，另留幾分鐘進場',travel:'步行約 4–6 分'},
    {id:'refresh14',date:'2026-09-14',start:'15:40',end:'16:20',activity:'回飯店｜洗澡＋休息',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Discovery+Kartika+Plaza+Hotel+Bali',place:'Waterbom → Discovery 步行約 4–6 分；15:40 後是洗澡休息',travel:''},
    {id:'meet15',date:'2026-09-15',start:'03:15',end:'04:00',activity:'巴杜爾火山｜集合＋換 Jeep＋等待出發',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Mount+Batur+Bali',place:'巴杜爾火山 Jeep 集合點｜這段不是車程',travel:''},
    {id:'tosanur16',date:'2026-09-16',start:'07:00',end:'07:40',activity:'庫塔 Kuta → 沙努爾碼頭',kind:'transport',major:false,status:'pending',map:'https://www.google.com/maps/search/?api=1&query=Sanur+Harbour+Bali',place:'Kuta → Sanur Harbour｜實際車程約 30–40 分',travel:'車程約 30–40 分'},
    {id:'port16',date:'2026-09-16',start:'07:40',end:'08:00',activity:'沙努爾碼頭｜報到＋登船',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Sanur+Harbour+Bali',place:'Sanur Harbour｜報到／等船，不算道路交通',travel:''},
    {id:'land16',date:'2026-09-16',start:'14:35',end:'15:15',activity:'回到沙努爾｜下船＋整理＋接車',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Sanur+Harbour+Bali',place:'Sanur Harbour｜下船整理與找車，不算 Sanur→Ubud 車程',travel:''},
    {id:'reg17',date:'2026-09-17',start:'10:20',end:'11:30',activity:'Kuber｜報到＋換裝＋安全說明',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Kuber+BALI+ADVENTURE',place:'Kuber ATV｜活動前流程，不算車程',travel:''},
    {id:'rest18',date:'2026-09-18',start:'11:00',end:'13:00',activity:'Villa｜泳池＋午餐＋休息',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Dolce+x+The+Young+Villas+Bali',place:'佩卡圖／烏魯瓦圖｜Dolce x The Young Villas',travel:''},
    {id:'tobc18',date:'2026-09-18',start:'13:20',end:'14:00',activity:'Villa → Beach Club',kind:'transport',major:false,status:'todo',map:'https://www.google.com/maps/search/?api=1&query=beach+club+Uluwatu+Bali',place:'烏魯瓦圖區內｜目前先抓 20–40 分；選定 Beach Club 後再精準校正',travel:'選店後校正；先抓 20–40 分'},
    {id:'back18',date:'2026-09-18',start:'18:30',end:'19:10',activity:'Beach Club → Villa',kind:'transport',major:false,status:'todo',map:'https://www.google.com/maps/search/?api=1&query=Dolce+x+The+Young+Villas+Bali',place:'烏魯瓦圖區內｜選店後再精準校正',travel:'選店後校正；先抓 20–40 分'},
    {id:'dinner18',date:'2026-09-18',start:'19:30',end:'21:00',activity:'烏魯瓦圖｜晚餐',kind:'food',major:false,status:'todo',map:'https://www.google.com/maps/search/?api=1&query=Uluwatu+Bali+dinner',place:'烏魯瓦圖 Uluwatu',travel:''},
    {id:'pack19',date:'2026-09-19',start:'10:00',end:'11:00',activity:'Villa｜整理行李＋最後確認',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=Dolce+x+The+Young+Villas+Bali',place:'Dolce x The Young Villas',travel:''},
    {id:'out19',date:'2026-09-19',start:'11:00',end:'11:30',activity:'Villa Check-out',kind:'hotel',major:false,status:'booked',map:'https://www.google.com/maps/search/?api=1&query=Dolce+x+The+Young+Villas+Bali',place:'佩卡圖／烏魯瓦圖｜退房、確認沒有遺漏',travel:''},
    {id:'air19',date:'2026-09-19',start:'12:45',end:'15:25',activity:'DPS｜航空報到＋安檢＋出境＋登機口',kind:'rest',major:false,status:'none',map:'https://www.google.com/maps/search/?api=1&query=I+Gusti+Ngurah+Rai+International+Airport',place:'伍拉賴國際機場｜這段是機場流程，不算道路車程',travel:''}
  ];

  for(const e of events){ if(patch[e.id]) Object.assign(e,patch[e.id]); }
  const removeIds=new Set(['lg18','os18']);
  events=events.filter(e=>!removeIds.has(e.id));
  for(const add of additions){ if(!events.some(e=>e.id===add.id)) events.push(add); }
  events.sort((a,b)=>whenMs(a)-whenMs(b));
  saveEvents();
  localStorage.setItem(VERSION,'1');
  renderAll();
})();
