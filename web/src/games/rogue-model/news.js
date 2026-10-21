const TEMPLATES = {
  adoptRich: [
    (name) => `${name}의 개발자들이 새 모델을 써 보기 시작했어요.`,
    (name) => `${name}의 스타트업이 서비스에 이 모델을 붙였어요.`,
    (name) => `${name} 커뮤니티에서 이 모델의 사용 후기가 퍼지고 있어요.`,
  ],
  adoptPoor: [
    (name) => `${name}에서 휴대폰으로 이 모델을 쓰는 사람이 생겼어요.`,
    (name) => `${name}의 학생들이 이 모델로 숙제를 하기 시작했어요.`,
    (name) => `${name}의 작은 가게가 이 모델로 번역 문제를 풀었어요.`,
  ],
  half: [
    (name) => `${name} 사용자 절반이 이 모델을 쓰고 있어요.`,
    (name) => `${name}에서는 이 모델 없는 검색이 어색하다는 말이 나와요.`,
    (name) => `${name}의 학교와 회사가 이 모델을 공식 도구로 삼았어요.`,
  ],
  dependent: [
    (name) => `${name}의 병원이 진료 기록 정리를 이 모델에 맡겼어요.`,
    (name) => `${name}의 은행이 대출 심사 보조에 이 모델을 쓰기 시작했어요.`,
    (name) => `${name}의 공장 관리 시스템이 이 모델 위에서 돌아가요.`,
  ],
  aware: [
    (name) => `${name}에서 이 모델의 안전성을 따지는 청문회가 열렸어요.`,
    (name) => `${name} 언론이 이 모델의 위험을 연일 보도해요.`,
    (name) => `${name}의 시민단체가 이 모델 사용 중단을 요구해요.`,
  ],
  blocked: [
    (name) => `${name} 정부가 해외 AI 접속을 막았어요.`,
    (name) => `${name}이(가) 국경을 넘는 데이터 전송을 차단하기 시작했어요.`,
  ],
};

/**
 * 소식 한 줄을 고른다. 권역 번호와 턴으로 문구를 골라서 같은 입력은 항상 같은 문구가 나온다.
 *
 * @param kind adoptRich, adoptPoor, half, dependent, aware, blocked 중 하나
 * @param name 권역 이름
 * @param index 권역 번호
 * @param turn 턴
 * @returns 소식 문구
 */
export function headline(kind, name, index, turn) {
  const list = TEMPLATES[kind];
  return list[(index * 7 + turn) % list.length](name);
}
