// node reply.test.mjs — 실패하면 에러로 멈춤 (정답지: 영상/cardnews-reel/capture/ep05-plan.md)
import assert from 'node:assert/strict';
import { measure, parseKakao, timeFromGap, gauge, split } from './reply.js';

const chat = (mine, reply) => [{ who: 'me', text: mine }, { who: 'them', text: reply }];
const ask = '내일 영화 볼래? 🥺';

// 피그마 시안 그대로: 36.5 − 10.0 − 9.6 − 4.5 = 12.4 ❄️
let r = measure(chat(ask, 'ㅇㅇ'), 'hours', 'some');
assert.equal(r.temp, 12.4);
assert.deepEqual(r.items.map((x) => x.d), [36.5, -10, -9.6, -4.5]);
assert.equal(r.items[2].why, '단답 “ㅇㅇ” (내 말 8자 → 2자)');
assert.equal(r.name, '쌀쌀한 편');
assert.equal(gauge(r.temp), 0.248);

// 함정 1 맥락: 같은 ㅇㅇ도 바로 오면 더 따뜻함, 친구 사이면 늦어도 덜 깎임
const fast = measure(chat(ask, 'ㅇㅇ'), 'fast').temp;
assert.ok(fast > r.temp + 10, `fast ${fast}`);
assert.ok(measure(chat(ask, 'ㅇㅇ'), 'hours', 'friend').temp > r.temp);

// 함정 2 ㅋ 개수: ㅋ 하나는 ㅋㅋ보다 차갑고, 많을수록 뜨거움
const joke = '나 오늘 교수님 앞에서 넘어짐';
const [k1, k6, k12] = ['ㅋ', 'ㅋㅋㅋㅋㅋㅋ', 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 미쳤다'].map((t) => measure(chat(joke, t), 'fast').temp);
assert.ok(k1 < 36.5 && k1 < k6 && k6 < k12, `${k1} ${k6} ${k12}`);
assert.ok(k12 >= 48, `k12 ${k12}`); // 🔥

// 함정 3 비꼬기: 물결 + ^^ + "잘됐네"는 따뜻하게 안 봄
const s = measure(chat('나 장학금 받았어!! 🎉', '아~ 그래~ 잘됐네~^^'), 'fast');
assert.ok(s.sarcasm && s.temp < 33, `sarcasm ${s.temp}`);
assert.equal(s.name, '말만 따뜻함');
// 진짜 축하는 비꼬기 아님
const real = measure(chat('나 장학금 받았어!! 🎉', '헐 대박 축하해!! 🎉 밥 사!'), 'fast');
assert.ok(!real.sarcasm && real.temp >= 40, `real ${real.temp}`);

// 질문하면 데워짐, 마침표 단답은 차가움
assert.ok(measure(chat(ask, '좋아! 몇 시에 볼까?'), 'fast').temp > 40);
assert.ok(measure(chat(ask, '응.'), 'fast').temp < measure(chat(ask, '응'), 'fast').temp);

// 답장이 없으면 결과 없음, 내 말 여러 줄은 합침
assert.equal(measure([{ who: 'me', text: '야' }]), null);
assert.deepEqual(split([{ who: 'me', text: 'a' }, { who: 'me', text: 'b' }, { who: 'them', text: 'c' }]), { mine: 'a b', reply: 'c' });

// 카톡 붙여넣기: PC 복사 형식, 오후/자정 넘김, 간격으로 시간 칩 자동 선택
let p = parseKakao('[민지] [오후 4:02] 내일 영화 볼래? 🥺\n[준호] [오후 7:15] ㅇㅇ');
assert.deepEqual(p.msgs.map((m) => m.who), ['me', 'them']);
assert.equal(p.gap, 193);
assert.equal(timeFromGap(p.gap), 'hours');
assert.equal(parseKakao('[a] [오후 11:50] 자?\n[b] [오전 12:05] ㅇㅇ').gap, 15);
// 내보내기 형식 + 여러 줄 메시지
p = parseKakao('2026. 10. 15. 오후 1:00, 나 : 밥 먹었어?\n2026. 10. 15. 오후 1:01, 친구 : 응\n먹었지');
assert.deepEqual(p.msgs, [{ who: 'me', text: '밥 먹었어?' }, { who: 'them', text: '응\n먹었지' }]);
assert.equal(timeFromGap(p.gap), 'fast');
// 형식 없는 그냥 텍스트는 상대 답장으로
assert.deepEqual(parseKakao('ㅇㅇ').msgs, [{ who: 'them', text: 'ㅇㅇ' }]);
console.log('reply ok', { fast, k1, k6, k12, sarcasm: s.temp, real: real.temp });
