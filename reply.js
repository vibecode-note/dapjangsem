// 답장셈 로직 (화면과 분리해서 reply.test.mjs로 검증)
// 기본 체온 36.5°에서 출발해 근거마다 더하고 빼는 재미용 규칙. 정답지: 영상/cardnews-reel/capture/ep05-plan.md

export const TIMES = [
  { id: 'fast', label: '바로', delta: 3, why: '30분 안에 답장' },
  { id: 'hour', label: '1시간', delta: -3, why: '답장이 1시간쯤 뒤에 옴' },
  { id: 'hours', label: '3시간 뒤', delta: -10, why: '답장이 3시간 뒤에 옴' },
  { id: 'day', label: '다음날', delta: -16, why: '답장이 다음날 옴' },
];
// 사이에 따라 답장 속도를 얼마나 신경 쓸지 (썸이 기준)
export const RELS = [
  { id: 'some', label: '💘 썸', w: 1 },
  { id: 'friend', label: '👯 친구', w: 0.6 },
  { id: 'love', label: '💑 연인', w: 1.2 },
  { id: 'team', label: '📚 팀플', w: 0.5 },
];

const seg = new Intl.Segmenter('ko', { granularity: 'grapheme' });
export const len = (s) => [...seg.segment(s.replace(/\s/g, ''))].length;
const EMOJI = /\p{Extended_Pictographic}/u;
const r1 = (n) => Math.round(n * 10) / 10;

export function timeFromGap(min) {
  if (min == null) return null;
  return min < 30 ? 'fast' : min < 120 ? 'hour' : min < 720 ? 'hours' : 'day';
}

// 대화: [{ who: 'me'|'them', text }]. 마지막 내 말 뒤에 온 상대 말들을 답장으로 봄
export function split(msgs) {
  const m = msgs.filter((x) => x.text.trim());
  let i = m.length;
  while (i > 0 && m[i - 1].who === 'them') i--;
  const reply = m.slice(i).map((x) => x.text.trim()).join(' ');
  let j = i;
  while (j > 0 && m[j - 1].who === 'me') j--;
  const mine = m.slice(j, i).map((x) => x.text.trim()).join(' ');
  return { mine, reply };
}

export function measure(msgs, timeId = 'fast', relId = 'some') {
  const { mine, reply } = split(msgs);
  if (!reply) return null;
  const items = [{ e: '🧍', why: '기본 체온', d: 36.5 }];
  const add = (e, why, d) => d && items.push({ e, why, d: r1(d) });

  const t = TIMES.find((x) => x.id === timeId) || TIMES[0];
  const w = (RELS.find((x) => x.id === relId) || RELS[0]).w;
  add('⏱', t.why, t.delta < 0 ? t.delta * w : t.delta);

  const k = (reply.match(/ㅋ/g) || []).length, h = (reply.match(/ㅎ/g) || []).length;
  const tildes = (reply.match(/~/g) || []).length, smile = /\^\^/.test(reply);
  const hype = reply.match(/미쳤|대박|헐|ㄹㅇ|레전드|개웃|진짜\?/)?.[0];
  const sarcasm = (tildes >= 2 || smile) && k < 4 && /잘됐|좋겠|부럽|대단|그래|그렇구나|알겠|축하|좋네/.test(reply);
  const emoji = EMOJI.test(reply) || (smile && !sarcasm);
  const q = /[?？]/.test(reply);

  // 길이: 내 말 대비. 웃음으로 채운 답장은 단답으로 안 봄
  const n = len(reply), mn = mine ? len(mine) : 0;
  if (k + h < 2) {
    if (mn) {
      const r = n / mn;
      if (r < 1) add('✂️', n <= 3 ? `단답 “${reply}” (내 말 ${mn}자 → ${n}자)` : `내 말보다 짧아요 (${mn}자 → ${n}자)`, -12.8 * (1 - r));
      else if (r >= 1.5) add('📝', '내 말보다 길게 답함', 3);
    } else if (n <= 3) add('✂️', `단답 “${reply}”`, -8);
  }

  if (k === 1) add('😐', 'ㅋ 딱 하나 (영혼 없음)', -3);
  else if (k) add('🤣', `ㅋ ${k}개`, k <= 3 ? 2 : k <= 7 ? 5 : 8);
  if (h === 1) add('😶', 'ㅎ 딱 하나', -1.5);
  else if (h) add('☺️', `ㅎ ${h}개`, 1.5);
  if (hype) add('🙌', `리액션 “${hype}”`, 3);
  if (q) add('💬', '질문으로 대화를 이어감', 4);
  if (emoji) add('✨', '이모지·이모티콘', 2.5);
  if (!q && !emoji && !k && !h && !hype) add('❔', '질문·이모지 없음', -4.5);
  if (/[^.]\.$|^\.$/.test(reply)) add('🛑', '마침표로 딱 끝냄', -2);
  else if (/(\.\.|…)$/.test(reply)) add('💭', '말줄임표로 끝냄…', -1.5);
  if (sarcasm) add('🙃', `비꼬기 의심 (${tildes >= 2 ? '물결 ~' : ''}${tildes >= 2 && smile ? ' + ' : ''}${smile ? '^^' : ''})`, -14);

  const temp = r1(items.reduce((s, x) => s + x.d, 0));
  return { temp, items, sarcasm, mine, reply, ...level(temp, sarcasm) };
}

const LEVELS = [
  [0, '🧊', '꽁꽁 얼었어요', '지금은 답장보다 시간이 필요해 보여요.\n재촉하지 말고 한 템포 쉬어 가요.', '바쁜가 보네! 여유 생기면 연락 줘 🙂', '재촉하면 더 차가워져요. 공은 상대에게!'],
  [20, '❄️', '쌀쌀한 편', '답장은 했지만 신나 보이진 않아요.\n바쁜 걸 수도 있으니 한 번만 더 가볍게!', '그럼 토요일 3시 어때? 🍿', '시간을 콕 집어 물으면 단답보다 긴 답이 와요'],
  [33, '🌥️', '미지근해요', '나쁘진 않은데 아직 탐색 중이에요.\n상대 얘기를 꺼내 보면 데워질 거예요.', '너는 요즘 뭐 하고 지내? 😆', '상대 얘기를 묻는 질문이 온도를 올려요'],
  [40, '🙂', '딱 체온', '편하게 대화하는 중이에요.\n무난무난, 아주 정상 체온!', 'ㅋㅋㅋ 그니까! 그래서 어떻게 됐어?', '맞장구 + 질문 콤보로 이어 가기'],
  [48, '☀️', '따끈따끈', '대화가 즐거운가 봐요.\n지금 분위기 좋아요!', '오 그럼 이번 주에 볼래? 😎', '분위기 좋을 때 약속 잡기!'],
  [Infinity, '🔥', '설렘 폭발', '이 정도면 답장 기다리고 있었던 거 아닐까요?\n온도계가 터지기 직전!', '나도 너랑 얘기하는 거 재밌어 ☺️', '이 온도면 솔직해도 괜찮아요'],
];
export function level(temp, sarcasm = false) {
  const [, emoji, name, desc, say, tip] = LEVELS.find(([max]) => temp < max);
  if (sarcasm) return { emoji: '🙃', name: '말만 따뜻함', desc: '말은 좋은데 물결과 ^^가 수상해요.\n진짜 축하인지 한 번 더 확인해 봐요.', say: '혹시 나 서운하게 한 거 있어? 🥲', tip: '비꼬는 느낌이면 먼저 물어보는 게 빨라요' };
  return { emoji, name, desc, say, tip };
}

// 게이지 위치 0~1 (0°~50°)
export const gauge = (temp) => Math.min(1, Math.max(0, temp / 50));

// 카톡 대화 붙여넣기: PC "[이름] [오후 3:12] 내용" / 내보내기 "2026. 10. 15. 오후 3:12, 이름 : 내용"
// 마지막으로 말한 사람을 상대로 봄. 시각이 있으면 내 마지막 말 → 상대 첫 답장 간격(분)도 계산
const PC = /^\[(.+?)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/;
const EXP = /^(?:\d{4}\. ?\d{1,2}\. ?\d{1,2}\.? )?(오전|오후) (\d{1,2}):(\d{2}), (.+?) : (.*)$/;
const mins = (ap, hh, mm) => ((+hh % 12) + (ap === '오후' ? 12 : 0)) * 60 + +mm;
export function parseKakao(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = line.match(PC))) rows.push({ name: m[1], t: mins(m[2], m[3], m[4]), text: m[5] });
    else if ((m = line.match(EXP))) rows.push({ name: m[4], t: mins(m[1], m[2], m[3]), text: m[5] });
    else if (line.trim() && rows.length) rows[rows.length - 1].text += '\n' + line;
    else if (line.trim()) rows.push({ name: null, t: null, text: line });
  }
  if (!rows.length) return { msgs: [], gap: null };
  const them = rows[rows.length - 1].name;
  const msgs = rows.map((r) => ({ who: them && r.name !== them ? 'me' : 'them', text: r.text }));
  let i = rows.length;
  while (i > 0 && msgs[i - 1].who === 'them') i--;
  let gap = null;
  if (i > 0 && rows[i - 1].t != null && rows[i].t != null) gap = (rows[i].t - rows[i - 1].t + 1440) % 1440;
  return { msgs, gap };
}
