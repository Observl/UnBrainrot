export const queryBanks={
 '全部':['意识 认知科学','哲学 思想','文学 艺术','前沿科学 科普','人工智能 伦理','生物 科普','心理学 认知','文化 人文','宇宙 物理','卡夫卡 文学'],
 '哲学与人文':['哲学 人文','哲学 思想','艺术 审美','文学 思想','伦理学 哲学'],
 '心理与认知':['认知科学 科普','情绪 心理学','记忆 神经科学','认知偏差 心理','决策 心理学'],
 '社会与文化':['文化 艺术','文学 文化','艺术 社会','文化 人类学','审美 文化'],
 '科技与伦理':['人工智能 伦理','算法 科普','科技 伦理','人工智能 研究','技术 哲学'],
 '前沿科学':['量子 科普','生物 科普','宇宙 科普','神经科学 研究','前沿科学'],
 '经典名著':['红楼梦 文学解读','陀思妥耶夫斯基 文学','鲁迅 文学解读','莎士比亚 文学','百年孤独 文学','西游记 文学','卡夫卡 文学','简爱 文学','围城 文学','悲惨世界 文学']};
export function discoveryPlan(topic,round,logicalPage){const news=['头版头条','财经动态','商业'].includes(topic);if(news)return {query:topic==='财经动态'?'金融市场':'商业新闻',page:1,seed:topic+':'+round,news:true};const bank=queryBanks[topic]||queryBanks['全部'],slot=round+logicalPage-1;return {query:bank[slot%bank.length],page:Math.floor(slot/bank.length)%50+1,seed:topic+':'+round,news:false}}
export function nextDiscoveryRound(topic){try{const rounds=JSON.parse(localStorage.getItem('ub-discovery-rounds')||'{}'),n=(Number(rounds[topic])||Math.floor(Math.random()*10))+1;rounds[topic]=n%100000;localStorage.setItem('ub-discovery-rounds',JSON.stringify(rounds));return rounds[topic]}catch{return Math.floor(Math.random()*60)}}
