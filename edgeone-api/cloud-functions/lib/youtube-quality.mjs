import {relevant} from './knowledge.js';

// Conservative metadata checks, not proof of factual accuracy or production quality.
export const youtubePolicy={mode:'exceptional-only',minimumDurationSeconds:240,minimumDescriptionCharacters:100,minimumAIConfidence:0.92,requirements:'YouTube仅保留与本次query高度相关、原创且有实质解释深度的内容。标题初筛后结合简介确认具体问题、论证或研究依据；泛泛介绍、猎奇标题、营销、搬运、纯访谈闲聊以及证据不足均删除。订阅数和时长不能证明优质，不得为补齐数量放宽标准。'};
export function youtubeQualityReason(item,query=''){
 if(item.provider!=='youtube'&&item.source!=='YouTube')return null;
 const title=String(item.title||''),desc=String(item.description||item.desc||'').trim();
 if(!Number.isFinite(item.duration)||item.duration<240)return 'YouTube缺少时长信息或不足4分钟';
 if(desc.length<100)return 'YouTube简介不足以支持严格审核';
 if(/you won'?t believe|shocking|mind.?blowing|insane|must watch|top\s*\d+|reaction|reacts to|compilation|highlights|震惊|颠覆三观|必看|盘点|混剪|搬运/iu.test(title))return 'YouTube标题党、反应视频或整合剪辑';
 if(!relevant(item,query))return 'YouTube与检索主题不高度相关';
 const terms=query.normalize('NFKC').toLowerCase().split(/\s+/u).filter(x=>x.length>1&&!['and','the','of','in','for','with','深度','科普','知识','内容','思考'].includes(x));
 if(!terms.length||!terms.some(term=>relevant({title,desc:'',tags:'',author:''},term)))return 'YouTube标题未直接命中检索主题';
 if(!/explain|evidence|research|experiment|mechanism|analysis|theor|proof|how\b|why\b|understand|discover|科学|原理|研究|实验|机制|分析|论证|为什么|如何|解读|考古|史料/iu.test(title+' '+desc))return 'YouTube缺少实质解释或研究线索';
 return null;
}
