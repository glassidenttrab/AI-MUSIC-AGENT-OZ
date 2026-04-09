# 🛑 Absolute Project Isolation Policy (절대 프로젝트 격리 규정)

이 문서는 **AI MUSIC AGENT OZ** 서비스와 **ARIN 인스타그램 마스터** 서비스 간의 물리적 및 운영적 격리를 명문화한 절대 지침입니다. 어떠한 경우에도 두 서비스의 프로세스나 데이터를 결합하지 않습니다.

## 1. 프로젝트 범위 및 경로 (Scoping)
- **AI MUSIC AGENT OZ**: `f:\ProJectHome\AI MUSIC AGENT OZ` (Node.js 기반)
- **ARIN INSTA MASTER**: `f:\ProJectHome\Ozpix_Instar_Arin` (Python 기반)

## 2. 격리 원칙 (Core Principles)
1. **프로세스 간섭 금지**: 음악 에이전트의 스케줄러(`master_scheduler.js`)는 `ARIN_INSTA_MASTER` 프로세스를 제어하거나 신호를 보낼 수 없습니다.
2. **경로 참조 금지**: 음악 에이전트 소스 코드 내에서 `f:\ProJectHome\Ozpix_Instar_Arin` 경로나 상위 디렉토리(`../`)에 대한 상대적 참조를 절대 금지합니다.
3. **데이터 공유 금지**: 두 프로젝트는 인증 정보(.env), 로그, 메모리 데이터를 공유하지 않으며, 각각 독립된 인프라를 사용합니다.
4. **PM2 관리 분리**: 두 서비스는 동일한 PM2 데몬 내에서 구동되더라도, 개별적인 설정 파일(Ecosystem)을 유지하며 서로의 가동 상태에 의존하지 않습니다.

## 3. 에이전트 행동 지침 (Agent AI Rules)
- 모든 AI 에이전트는 음악 제작 및 업로드 코드를 수정할 때, 해당 수정이 인스타그램 연동 프로세스에 조금이라도 영향을 주는지 상시 확인해야 합니다.
- 만약 사용자나 시스템이 두 프로젝트를 통합하려는 의도가 감지되면, 이 규정을 근거로 **통합을 거부하고 분리 유지를 강력히 권고**해야 합니다.

---
> [!CAUTION]
> **이 지침은 사용자의 명시적인 직접 명령(Direct Command)이 없는 한 절대 수정되거나 위반되어서는 안 됩니다.**
