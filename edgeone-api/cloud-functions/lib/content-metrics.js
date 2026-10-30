export function detectLanguage(item={}){
 const title=String(item.title||''),sample=(title+' '+(item.contentText||item.desc||item.description||'')).slice(0,6000);
 const han=s=>(s.match(/\p{Script=Han}/gu)||[]).length,latin=s=>(s.match(/[A-Za-z]/g)||[]).length;
 const th=han(title),tl=latin(title);if(th>=3&&th/(th+tl)>.18)return 'zh';
 const h=han(sample),l=latin(sample),other=(sample.match(/[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/gu)||[]).length;
 const words=sample.toLowerCase().match(/[a-z]+/g)||[],english=new Set('the a an and of to in for with on is that are it this from how what why can we you as at by be was have'.split(' ')),foreign=new Set('der die das und ist ein eine des den la le les une un et que el los las por para una con est dans'.split(' '));const e=words.filter(w=>english.has(w)).length,f=words.filter(w=>foreign.has(w)).length;if(f>e&&f>=3)return 'other';if(other>h+l*.4)return 'other';if(h>=10&&h/(h+l)>.15)return 'zh';if(l>=12&&h/(h+l)<.08&&e>=2)return 'en';
 return /^zh\b/i.test(item.declaredLanguage||'')?'zh':/^en\b/i.test(item.declaredLanguage||'')?'en':'unknown';
}
export function estimateReading(body){
 const value=String(body||'').trim();if(value.length<100)return null;
 const chineseCharacters=(value.match(/\p{Script=Han}/gu)||[]).length,englishWords=(value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[]).length;
 return {minutes:Math.max(1,Math.ceil(chineseCharacters/350+englishWords/220)),chineseCharacters,englishWords,basis:'extracted-body',isEstimate:true};
}
