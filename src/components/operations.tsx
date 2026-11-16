"use client";

import Link from "./workspace-link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { activities, attachBook, recordEvent, setActivityEnabled, type Activity } from "@/lib/model";
import { catalog } from "@/lib/catalog";
import { Icon, type IconName } from "./icons";
import { useReading } from "./provider";

const activityDetails: Record<Activity, { ko: string; en: string; help: string; helpEn: string; icon: IconName; href: string }> = {
  read: { ko: "책 읽기", en: "Read", help: "같은 책을 화면이나 종이로 읽어요.", helpEn: "Read the same story on screen or on paper.", icon: "book", href: "/library" },
  question: { ko: "질문 만들기", en: "Ask", help: "학생이 궁금한 것을 자기 말로 남겨요.", helpEn: "Let students put their own curiosity into words.", icon: "question", href: "/inquiry" },
  discuss: { ko: "생각 나누기", en: "Discuss", help: "서로의 질문을 고르고 본문에서 근거를 찾아요.", helpEn: "Choose a question together and look for evidence in the story.", icon: "users", href: "/inquiry?tab=shared" },
  theater: { ko: "낭독극", en: "Readers’ theater", help: "인물의 마음을 생각하며 대본을 함께 읽어요.", helpEn: "Read a script together and explore the characters’ feelings.", icon: "theater", href: "/theater" },
  studio: { ko: "책 만들기", en: "Make a book", help: "우리의 초고와 생각을 모아 다음 이야기를 써요.", helpEn: "Bring your own drafts and ideas into the next story.", icon: "pencil", href: "/studio" },
};

export function TeacherWorkspace() {
  const { state, setState, t, toast } = useReading();
  const books = [...catalog, ...state.published, ...state.imported];
  const enabledCount = activities.filter(activity => state.enabled[activity]).length;
  const paperCount = activities.filter(activity => state.enabled[activity] && state.evidence[activity] === "paper").length;

  function markPaperParticipation() {
    setState(previous => {
      let next = { ...previous, evidence: { ...previous.evidence } };
      for (const activity of activities) {
        if (!previous.enabled[activity] || previous.evidence[activity] === "paper") continue;
        next.evidence[activity] = "paper";
        next = recordEvent(next, "activity.paper_recorded", activity);
      }
      return next;
    });
    toast(t("여정에 포함된 활동에 종이 참여를 표시했어요.", "Paper participation is marked for the activities in this journey."));
  }

  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t("교사 수업 준비실", "TEACHER WORKSPACE")}</p>
          <h1>{t("수업 이야기 여정", "Our lesson story journey")}</h1>
          <p className="muted">{t("오늘 읽을 책과 필요한 활동만 골라 주세요. 여정에 넣지 않은 활동도 작업실에서 따로 시작할 수 있어요.", "Choose a book and just the activities you need. Every workspace can also be opened on its own.")}</p>
        </div>
        <Link className="button secondary" href="/"><Icon name="map" />{t("여정으로 돌아가기", "Back to the journey")}</Link>
      </header>

      <section className="surface stack" aria-labelledby="teacher-book-heading">
        <div className="row">
          <h2 className="panel-title" id="teacher-book-heading">{t("함께 읽을 책", "The book we will share")}</h2>
          <span className="badge">{t("이 기기에 저장하는 수업", "Lesson saved on this device")}</span>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>{t("여정에 연결할 책", "Book for this journey")}</span>
            <select
              value={state.journeyBookId}
              aria-describedby="teacher-book-help"
              onChange={event => {
                const bookId = event.target.value;
                if (!books.some(book => book.id === bookId)) return;
                setState(previous => previous.journeyBookId === bookId ? previous : attachBook(previous, bookId));
                toast(t("여정의 책을 바꿨어요. 질문과 원고는 그대로 보관돼요.", "The journey’s book has changed. Questions and drafts are kept."));
              }}
            >
              {books.map(book => <option key={book.id} value={book.id}>{t(book.title, book.en)}</option>)}
            </select>
          </label>
          <div className="field">
            <span>{t("수업 안내", "Lesson note")}</span>
            <p>{t("읽어 주기, 혼자 읽기, 모둠 읽기 중 학급에 맞는 방법을 선택하세요. 모든 활동을 한 차시에 끝낼 필요는 없어요.", "Read aloud, read independently, or read in groups to suit your class. There is no need to finish every activity in one lesson.")}</p>
          </div>
        </div>
        <p className="muted" id="teacher-book-help">{t("책을 바꾸면 이 여정의 참여 표시만 새로 시작해요. 이미 쓴 질문과 책 원고는 삭제하지 않아요.", "Changing the book resets this journey’s participation markers. Existing questions and book drafts are not deleted.")}</p>
      </section>

      <section className="surface stack" aria-labelledby="teacher-activities-heading">
        <div className="row">
          <h2 className="panel-title" id="teacher-activities-heading">{t("오늘의 활동 구성", "Choose today’s activities")}</h2>
          <span className="badge">{t(`${enabledCount}개 활동 포함`, `${enabledCount} activities included`)}</span>
        </div>
        <p className="muted">{t("포함을 해제하면 여정에서만 빠져요. 질문·원고·참여 기록은 보관되며 다시 연결할 수 있어요.", "Removing an activity only takes it out of the journey. Questions, drafts, and participation records are kept so you can reconnect it.")}</p>
        {activities.map(activity => {
          const detail = activityDetails[activity];
          return (
            <div className="settings-row" key={activity}>
              <div className="row">
                <Icon name={detail.icon} />
                <div>
                  <strong>{t(detail.ko, detail.en)}</strong>
                  <p className="muted">{t(detail.help, detail.helpEn)}</p>
                  {state.evidence[activity] === "paper" ? <span className="badge">{t("종이 참여 표시", "Paper participation marked")}</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="toggle"
                role="switch"
                aria-checked={state.enabled[activity]}
                aria-label={t(`${detail.ko} 여정에 포함`, `Include ${detail.en.toLowerCase()} in the journey`)}
                onClick={() => {
                  setState(previous => setActivityEnabled(previous, activity, !previous.enabled[activity]));
                  toast(state.enabled[activity]
                    ? t("여정에서 뺐어요. 기존 작업은 보관돼요.", "Removed from the journey. Existing work is kept.")
                    : t("여정에 다시 연결했어요.", "Connected to the journey."));
                }}
              >
                {state.enabled[activity] ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}
                {state.enabled[activity] ? t("포함", "Included") : t("제외", "Not included")}
              </button>
            </div>
          );
        })}
      </section>

      <section className="surface stack" aria-labelledby="teacher-paper-heading">
        <div className="row"><Icon name="print" /><h2 className="panel-title" id="teacher-paper-heading">{t("종이로 함께한 수업", "Learning together on paper")}</h2></div>
        <p>{t("기기 없이 읽고 묻고 나누었다면, 현재 여정에 포함된 활동에 종이 참여를 한 번에 표시하세요.", "If the class read, asked, and shared without devices, mark paper participation for the activities currently in the journey.")}</p>
        <div className="row">
          <button className="button secondary" type="button" disabled={enabledCount === 0 || paperCount === enabledCount} onClick={markPaperParticipation}>
            <Icon name={paperCount === enabledCount && enabledCount > 0 ? "check" : "print"} />
            {paperCount === enabledCount && enabledCount > 0 ? t("종이 참여 표시됨", "Paper participation marked") : t("포함된 활동에 종이 참여 표시", "Mark included activities as paper participation")}
          </button>
          <span className="muted">{t(`${enabledCount}개 중 ${paperCount}개 표시`, `${paperCount} of ${enabledCount} marked`)}</span>
        </div>
        <p className="muted">{enabledCount === 0
          ? t("먼저 오늘 함께한 활동을 여정에 포함해 주세요.", "First include the activities your class worked on today.")
          : t("학급 활동의 매체를 표시하는 기능이에요. 학생별 완독이나 성취 평가로 기록하지 않아요.", "This marks the format of a class activity. It does not record individual reading completion or achievement.")}</p>
      </section>

      <section className="surface stack" aria-labelledby="teacher-workspaces-heading">
        <h2 className="panel-title" id="teacher-workspaces-heading">{t("필요한 작업실 바로 열기", "Open a workspace directly")}</h2>
        <p className="muted">{t("책이나 여정을 먼저 연결하지 않아도 독립적으로 시작할 수 있어요.", "Start independently without first connecting a book or journey.")}</p>
        <div className="row">
          {activities.map(activity => {
            const detail = activityDetails[activity];
            return <Link key={activity} href={detail.href} className="button ghost"><Icon name={detail.icon} />{t(detail.ko, detail.en)}<Icon name="arrow" size={16} /></Link>;
          })}
          <Link href="/studio?mode=teacher" className="button ghost"><Icon name="pencil" />{t("교사 교재 제작", "Teacher book studio")}<Icon name="arrow" size={16} /></Link>
        </div>
      </section>
    </div>
  );
}

export function AdminWorkspace() {
  const { state, t } = useReading();
  const { user } = useAuth();
  const pathname = usePathname();
  const demo = pathname === "/demo" || pathname.startsWith("/demo/");
  const enabledCount = activities.filter(activity => state.enabled[activity]).length;
  const statusRows = [
    { ko: "작업 저장", en: "Workspace storage", status: "이 기기에 저장", statusEn: "On this device", detail: demo ? "체험 기록은 계정 작업과 분리해 이 브라우저에 저장합니다." : "작업은 로그인한 계정별로 이 브라우저에 저장합니다. 기기 간 동기화와 서버 백업은 아직 제공하지 않습니다.", detailEn: demo ? "Demo records are stored in this browser separately from account work." : "Work is stored in this browser under your signed-in account. Cross-device sync and server backup are not available yet." },
    { ko: "Google 로그인", en: "Google sign-in", status: demo ? "체험 모드" : user ? "로그인됨" : "확인 중", statusEn: demo ? "Demo mode" : user ? "Signed in" : "Checking", detail: demo ? "체험할 역할을 자유롭게 바꿀 수 있습니다. 실제 계정의 권한을 변경하지 않습니다." : "Firebase Google 인증과 서버 세션으로 로그인합니다. 관리자 화면은 서버에서 확인한 권한으로 접근합니다.", detailEn: demo ? "Demo roles can be switched freely. They never change real account permissions." : "Sign-in uses Firebase Google authentication and a server session. Admin access depends on server-verified permissions." },
    { ko: "사용 분석", en: "Analytics", status: "꺼짐", statusEn: "Off", detail: "외부 분석 도구로 전송하지 않습니다. 아래 기록은 이 작업 공간에서 남긴 활동입니다.", detailEn: "No external analytics transmission. Records below describe activity in this workspace." },
    { ko: "AI 낭독과 새 생성", en: "Narration and AI generation", status: "저장된 낭독 재생", statusEn: "Saved narration", detail: "샘플 고전은 저장된 음성으로 들을 수 있습니다. 운영 환경의 새 AI 질문·삽화 생성은 꺼져 있습니다.", detailEn: "Sample classics play saved narration. New AI question and illustration generation is disabled in production." },
    { ko: "과제 연동", en: "Homework integration", status: "꺼짐", statusEn: "Off", detail: "외부 과제 시스템에 배부하거나 제출하지 않습니다.", detailEn: "Nothing is assigned or submitted to an external homework system." },
  ];

  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t("운영 현황", "OPERATIONS")}</p>
          <h1>{demo ? t("운영 화면 체험하기", "Explore the operations desk") : t("작업 공간 운영 현황", "Workspace operations")}</h1>
          <p className="muted">{demo ? t("샘플 명부와 직접 남긴 체험 기록으로 운영 화면을 살펴보세요. 실제 학교 통계와는 별개예요.", "Explore the desk with a sample roster and your own demo activity. These are separate from real school statistics.") : t("현재 계정으로 이 기기에 저장한 활동과 연결 상태를 확인해요. 전체 학교나 다른 기기의 기록은 포함하지 않아요.", "Review activity saved for this account on this device and connection status. This does not include school-wide or other-device records.")}</p>
        </div>
        <span className="badge"><Icon name="shield" size={16} />{demo ? t("체험 기록", "Demo records") : t("내 작업 기록", "My workspace records")}</span>
      </header>

      <section className="stats-grid" aria-label={t("작업 공간 집계", "Workspace totals")}>
        <div className="stat-card"><span className="muted">{t("여정에 포함된 활동", "Included activities")}</span><strong>{enabledCount}<small> / {activities.length}</small></strong><span>{t("현재 수업 구성", "Current lesson setup")}</span></div>
        <div className="stat-card"><span className="muted">{t("저장한 질문", "Saved questions")}</span><strong>{state.questions.length}</strong><span>{t("이 작업 공간에 남긴 질문", "Questions in this workspace")}</span></div>
        <div className="stat-card"><span className="muted">{t("만든 책 판본", "Created book editions")}</span><strong>{state.published.length}</strong><span>{t("이 기기에 저장한 완성본", "Editions saved on this device")}</span></div>
        <div className="stat-card"><span className="muted">{t("활동 기록", "Activity records")}</span><strong>{state.events.length}</strong><span>{t("최근 최대 100건", "Up to 100 recent events")}</span></div>
      </section>

      <section className="surface stack" aria-labelledby="admin-connections-heading">
        <h2 className="panel-title" id="admin-connections-heading">{t("연결 상태", "Connection status")}</h2>
        {statusRows.map(row => <div className="settings-row" key={row.en}><div><strong>{t(row.ko, row.en)}</strong><p className="muted">{t(row.detail, row.detailEn)}</p></div><span className="badge">{t(row.status, row.statusEn)}</span></div>)}
        <p className="muted">{t("이 화면은 연결 상태를 안내합니다. 서비스 연결과 요금제 변경은 여기서 실행하지 않습니다.", "This page reports connection status. It does not connect services or change billing plans.")}</p>
      </section>

      {demo ? <section className="surface stack" aria-labelledby="admin-roster-heading">
        <div className="row"><h2 className="panel-title" id="admin-roster-heading">{t("학교 구성원 표시 예시", "Example school roster")}</h2><span className="badge">{t("가상 명부", "Fictional roster")}</span></div>
        <p className="muted">{t("화면 구성을 보여 주는 예시입니다. 실제 계정·membership·학생 명부와 연결되어 있지 않아요.", "An illustration of the roster layout. It is not connected to real accounts, memberships, or student records.")}</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">{t("학교", "School")}</th><th scope="col">{t("학급", "Class")}</th><th scope="col">{t("표시 이름", "Display name")}</th><th scope="col">{t("역할", "Role")}</th></tr></thead>
            <tbody>
              <tr><td>{t("바람초등학교 (가상)", "Wind Primary (fictional)")}</td><td>{t("3학년 1반", "Grade 3, Class 1")}</td><td>{t("샘플 교사", "Sample teacher")}</td><td>{t("교사 예시", "Teacher example")}</td></tr>
              <tr><td>{t("바람초등학교 (가상)", "Wind Primary (fictional)")}</td><td>{t("3학년 1반", "Grade 3, Class 1")}</td><td>{t("샘플 학생 A", "Sample student A")}</td><td>{t("학생 예시", "Student example")}</td></tr>
            </tbody>
          </table>
        </div>
      </section> : <section className="surface stack" aria-labelledby="admin-roster-heading"><h2 className="panel-title" id="admin-roster-heading">{t("학교 구성원", "School members")}</h2><p className="muted">{t("학교·학급 명부 연결은 아직 제공하지 않습니다. 계정 로그인과 관리자 접근 권한은 학교 명부와 별도로 확인합니다.", "School and class rosters are not connected yet. Account sign-in and administrator access are verified separately from school membership.")}</p></section>}

      <section className="surface stack" aria-labelledby="admin-events-heading">
        <div className="row"><Icon name="clock" /><h2 className="panel-title" id="admin-events-heading">{t("최근 활동 기록", "Recent activity")}</h2></div>
        <p className="muted">{t("이벤트 유형·자료 ID·시각만 표시합니다. 질문 원문이나 책 원고를 활동 기록에 복사하지 않아요.", "Only event type, resource ID, and time are shown. Question text and book drafts are not copied into activity logs.")}</p>
        {state.events.length === 0 ? <p className="muted">{t("아직 기록이 없어요. 책을 연결하거나 질문을 저장하면 여기에 표시돼요.", "No activity yet. Connecting a book or saving a question will add a record here.")}</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">{t("시각", "Time")}</th><th scope="col">{t("이벤트 유형", "Event type")}</th><th scope="col">{t("자료 ID", "Resource ID")}</th></tr></thead>
              <tbody>{state.events.map(event => {
                const occurredAt = new Date(event.at);
                const validTime = Number.isFinite(occurredAt.getTime());
                return <tr key={event.id}><td>{validTime ? <time dateTime={event.at}>{occurredAt.toLocaleString(state.locale === "ko" ? "ko-KR" : "en-US")}</time> : t("시각 없음", "Time unavailable")}</td><td><code>{event.type}</code></td><td><code>{event.resource}</code></td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
