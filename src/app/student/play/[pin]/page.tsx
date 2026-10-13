"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { MessageCircleHeart, Radio, Sparkles, Trophy } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { ModuleStartCountdown } from "@/components/common/ModuleStartCountdown";
import { ModuleFeedbackSurvey } from "@/components/student/ModuleFeedbackSurvey";
import { Module1SystemBuild } from "@/components/modules/Module1_SystemBuild";
import { Module2Relations } from "@/components/modules/Module2_Relations";
import { Module3Boundary } from "@/components/modules/Module3_Boundary";
import { Module4CompleteSystem } from "@/components/modules/Module4_CompleteSystem";
import { Module5RelationBalloons } from "@/components/modules/Module5_RelationBalloons";
import { Week3ProcessHierarchy } from "@/components/modules/Week3_ProcessHierarchy";
import { Week3MissingProcess } from "@/components/modules/Week3_MissingProcess";
import { Week3FlowchartSymbols } from "@/components/modules/Week3_FlowchartSymbols";
import { Week4FactoryTransform } from "@/components/modules/Week4_FactoryTransform";
import { Week4BossApproach } from "@/components/modules/Week4_BossApproach";
import { Week4SystemProcess } from "@/components/modules/Week4_SystemProcess";
import { getRemainingCountdown } from "@/lib/moduleCountdown";
import { getStudentGameState, getStudentSessionStatus, saveModuleDraft, saveSubmission, submitModuleFeedback } from "@/lib/session";
import type { ModuleDraft, ModuleId, ModuleSubmission, Session, Student, StudentProfile, Submission } from "@/types";

type AnswerReviewState = { key: string; until: number };

export default function StudentPlayPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [draft, setDraft] = useState<ModuleDraft | null>(null);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [readyModuleKey, setReadyModuleKey] = useState("");
  const [feedbackKeys, setFeedbackKeys] = useState<string[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDismissedKey, setFeedbackDismissedKey] = useState("");
  const [answerReview, setAnswerReview] = useState<AnswerReviewState | null>(null);
  const celebratedModuleKey = useRef("");
  const draftRevision = useRef(0);
  const answerReviewRef = useRef<AnswerReviewState | null>(null);
  const sessionSnapshot = useRef<Session | null>(null);
  const fullLoadInFlight = useRef<Promise<void> | null>(null);
  const statusLoadInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Yenilenen sekmenin revision aralığını önceki tarayıcı örneğinin ilerisine taşı.
    draftRevision.current = Date.now() * 1000;
  }, []);

  const load = useCallback(() => {
    if (fullLoadInFlight.current) return fullLoadInFlight.current;
    const task = (async () => {
      try {
        const studentId = localStorage.getItem(`system-lab:${pin}:student`);
        if (!studentId) { router.replace(`/student?pin=${pin}`); return; }
        const gameState = await getStudentGameState(pin, studentId);
        const previous = sessionSnapshot.current;
        if (previous && (previous.selected_week !== gameState.session.selected_week || previous.current_module !== gameState.session.current_module || previous.current_run_number !== gameState.session.current_run_number)) {
          setReadyModuleKey("");
          setFeedbackOpen(false);
          setFeedbackDismissedKey("");
          answerReviewRef.current = null;
          setAnswerReview(null);
          celebratedModuleKey.current = "";
          draftRevision.current = Date.now() * 1000;
        }
        sessionSnapshot.current = gameState.session;
        setSession(gameState.session);
        setStudent(gameState.student);
        setSubmissions(gameState.submissions);
        setDraft(gameState.draft || null);
        setClassmates(gameState.classmates);
        setProfile(gameState.profile);
        setFeedbackKeys(gameState.feedback_keys || []);
        setError("");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Oturum yüklenemedi.";
        if (message.startsWith("Katılımcı kaydı bulunamadı")) {
          localStorage.removeItem(`system-lab:${pin}:student`);
          router.replace(`/student?pin=${pin}`);
          return;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
    fullLoadInFlight.current = task;
    void task.finally(() => {
      if (fullLoadInFlight.current === task) fullLoadInFlight.current = null;
    });
    return task;
  }, [pin, router]);

  const loadStatus = useCallback(() => {
    if (statusLoadInFlight.current) return statusLoadInFlight.current;
    const task = (async () => {
      const studentId = localStorage.getItem(`system-lab:${pin}:student`);
      if (!studentId) { router.replace(`/student?pin=${pin}`); return; }
      try {
        const status = await getStudentSessionStatus(pin, studentId);
        const previous = sessionSnapshot.current;
        const roundChanged = !previous
          || previous.selected_week !== status.session.selected_week
          || previous.current_module !== status.session.current_module
          || previous.current_run_number !== status.session.current_run_number
          || previous.is_module_started !== status.session.is_module_started
          || previous.module_stage !== status.session.module_stage
          || previous.module_started_at !== status.session.module_started_at
          || previous.is_active !== status.session.is_active;
        if (previous && (previous.selected_week !== status.session.selected_week || previous.current_module !== status.session.current_module || previous.current_run_number !== status.session.current_run_number)) {
          setReadyModuleKey("");
          setFeedbackOpen(false);
          setFeedbackDismissedKey("");
          answerReviewRef.current = null;
          setAnswerReview(null);
          celebratedModuleKey.current = "";
          draftRevision.current = Date.now() * 1000;
        }
        sessionSnapshot.current = status.session;
        setSession(status.session);
        setStudent((current) => current ? { ...current, ...status.student } : current);
        if (roundChanged) await load();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Oturum durumu yüklenemedi.");
      }
    })();
    statusLoadInFlight.current = task;
    void task.finally(() => {
      if (statusLoadInFlight.current === task) statusLoadInFlight.current = null;
    });
    return task;
  }, [load, pin, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeSubmission = useMemo(
    () => submissions.find((item) => item.is_submitted && item.week_id === session?.selected_week && item.module_id === session?.current_module && item.run_number === session?.current_run_number) || null,
    [session?.current_module, session?.current_run_number, session?.selected_week, submissions],
  );
  const activeDraft = draft && draft.week_id === session?.selected_week && draft.module_id === session?.current_module && draft.run_number === session?.current_run_number ? draft : null;
  const currentWeek = session?.selected_week;
  const currentModule = session?.current_module;
  const currentRunNumber = session?.current_run_number;
  const isModuleStarted = session?.is_module_started;
  const resultsRevealed = !isModuleStarted && (session?.module_stage ?? 0) >= 3;
  const activeModuleKey = session ? `${currentWeek}:${currentModule}:${currentRunNumber}` : "";
  const isAnswerReviewing = answerReview?.key === activeModuleKey;
  const feedbackAvailable = Boolean(activeSubmission && !feedbackKeys.includes(activeModuleKey) && feedbackDismissedKey !== activeModuleKey);
  const shouldShowFeedback = Boolean(!isAnswerReviewing && activeSubmission && (feedbackOpen || feedbackAvailable));
  const activeCompletionStatus = activeSubmission?.completion_status
    ?? (activeSubmission?.payload?.completionReason === "teacher-ended" ? "incomplete" : "completed");

  const beginAnswerReview = useCallback((until: number) => {
    const review = { key: activeModuleKey, until };
    answerReviewRef.current = review;
    setAnswerReview(review);
    setFeedbackOpen(false);
  }, [activeModuleKey]);

  useEffect(() => {
    if (!answerReview || answerReview.key !== activeModuleKey) return;
    let timer: number | null = null;
    const finishWhenDue = () => {
      const remaining = answerReview.until - Date.now();
      if (remaining > 0) {
        timer = window.setTimeout(finishWhenDue, remaining);
        return;
      }
      if (answerReviewRef.current?.key === answerReview.key) answerReviewRef.current = null;
      setAnswerReview((current) => current?.key === answerReview.key ? null : current);
      if (activeSubmission) setFeedbackOpen(true);
    };
    timer = window.setTimeout(finishWhenDue, Math.max(0, answerReview.until - Date.now()));
    const onVisibilityChange = () => { if (!document.hidden) finishWhenDue(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeModuleKey, activeSubmission, answerReview]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    const schedule = () => {
      if (cancelled) return;
      const delay = document.hidden ? 20_000 + Math.random() * 10_000 : 5_500 + Math.random() * 2_500;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        await loadStatus();
        schedule();
      }, delay);
    };
    const refreshNow = () => { if (!document.hidden) void loadStatus(); };
    document.addEventListener("visibilitychange", refreshNow);
    window.addEventListener("focus", refreshNow);
    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshNow);
      window.removeEventListener("focus", refreshNow);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (isModuleStarted) return;
    const timer = window.setTimeout(() => setReadyModuleKey(""), 0);
    return () => window.clearTimeout(timer);
  }, [currentModule, currentWeek, isModuleStarted]);

  useEffect(() => {
    if (!resultsRevealed || !activeSubmission || !currentWeek || !currentModule || activeCompletionStatus === "incomplete") return;
    const moduleKey = `${currentWeek}:${currentModule}:${currentRunNumber}`;
    if (celebratedModuleKey.current === moduleKey) return;
    celebratedModuleKey.current = moduleKey;
    const timer = window.setTimeout(() => {
      confetti({ particleCount: 130, spread: 82, origin: { y: .72 }, colors: ["#10b981", "#6366f1", "#f59e0b", "#f472b6"] });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeCompletionStatus, activeSubmission, currentModule, currentRunNumber, currentWeek, resultsRevealed]);

  useEffect(() => {
    if (!resultsRevealed || activeSubmission) return;
    const timer = window.setTimeout(() => void load(), 350);
    return () => window.clearTimeout(timer);
  }, [activeSubmission, load, resultsRevealed]);

  async function submit(moduleId: ModuleId, submission: ModuleSubmission) {
    if (!session || !student || !session.is_module_started) return false;
    setSaving(true);
    setError("");
    try {
      const saved = await saveSubmission({ sessionId: session.id, studentId: student.id, studentNumber: student.student_number, weekId: session.selected_week, moduleId, expectedRunNumber: session.current_run_number, stage: submission.stage || 1, payload: submission.payload, score: submission.score });
      setSubmissions((current) => [...current.filter((item) => item.id !== saved.submission.id), saved.submission]);
      const review = answerReviewRef.current;
      const reviewingThisSubmission = review?.key === `${session.selected_week}:${moduleId}:${session.current_run_number}` && review.until > Date.now();
      if (!reviewingThisSubmission) setFeedbackOpen(true);
      setFeedbackDismissedKey("");
      setMessage(saved.wasNew ? "Yanıtınız güvenle kaydedildi." : "Bu modül için yanıt hakkını daha önce kullandın.");
      window.setTimeout(() => setMessage(""), 3500);
      return true;
    } catch (caught) {
      const failureMessage = caught instanceof Error ? caught.message : "Gönderim kaydedilemedi.";
      if (failureMessage === "Bu tur sona erdi. Güncel tur yükleniyor.") {
        setError("Tur kapandı, kayıt doğrulanıyor.");
        await load();
      } else {
        setError(failureMessage);
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  function saveDraft(moduleId: ModuleId, submission: ModuleSubmission) {
    if (!session || !student || !session.is_module_started || existingSubmissionFor(moduleId)) return Promise.resolve();
    const answeredCount = typeof submission.payload.answeredCount === "number"
      ? submission.payload.answeredCount
      : typeof submission.payload.evaluatedPlacements === "number"
        ? submission.payload.evaluatedPlacements
        : typeof submission.payload.evaluatedBlankCount === "number"
          ? submission.payload.evaluatedBlankCount
          : 0;
    const revision = ++draftRevision.current;
    setDraft({
      session_id: session.id,
      student_id: student.id,
      week_id: session.selected_week,
      module_id: moduleId,
      run_number: session.current_run_number,
      stage: submission.stage || 1,
      payload: submission.payload,
      score: submission.score,
      updated_at: new Date().toISOString(),
    });
    const task = saveModuleDraft({
        sessionId: session.id,
        studentId: student.id,
        weekId: session.selected_week,
        moduleId,
        expectedRunNumber: session.current_run_number,
        stage: submission.stage || 1,
        payload: submission.payload,
        score: submission.score,
        answeredCount,
        revision,
      })
      .then((result) => {
        if (result.saved || result.reason === "already-submitted") return;
        console.info("Module draft rejected", { reason: result.reason || "unknown" });
        if (result.reason === "module-closed-or-stale") void load();
      })
      .catch((caught) => {
        console.warn("Module draft save failed", caught);
      });
    return task;
  }

  function existingSubmissionFor(moduleId: ModuleId) {
    return submissions.some((item) => item.is_submitted && item.week_id === session?.selected_week && item.module_id === moduleId && item.run_number === session?.current_run_number);
  }

  async function sendFeedback(input: { funRating: number; difficultyRating: number; comment: string }) {
    if (!session || !student) throw new Error("Oturum bilgisi bulunamadı.");
    const feedbackKey = `${session.selected_week}:${session.current_module}:${session.current_run_number}`;
    await submitModuleFeedback({
      sessionId: session.id,
      studentId: student.id,
      weekId: session.selected_week,
      moduleId: session.current_module,
      expectedRunNumber: session.current_run_number,
      funRating: input.funRating,
      difficultyRating: input.difficultyRating,
      comment: input.comment,
    });
    setFeedbackKeys((current) => current.includes(feedbackKey) ? current : [...current, feedbackKey]);
    setMessage("Geri bildirimin kaydedildi. Teşekkürler!");
  }

  function closeFeedback() {
    setFeedbackOpen(false);
    setFeedbackDismissedKey(activeModuleKey);
  }

  if (loading) return <><Navbar /><main className="container page"><div className="empty">Canlı sınıfa bağlanılıyor…</div></main></>;
  if (!session || !student) return <><Navbar /><main className="container page"><div className="notice error">{error || "Katılımcı kaydı bulunamadı."}</div></main></>;

  const scoreEarned = (activeSubmission?.score ?? 0) + (activeSubmission?.speed_bonus ?? 0);
  const firstCheckCorrect = session.selected_week === 4
    && session.current_module === 3
    && activeSubmission?.payload.isChecked === true
    && typeof activeSubmission.payload.correctCount === "number"
    ? activeSubmission.payload.correctCount
    : null;
  const firstCheckTotal = firstCheckCorrect !== null && typeof activeSubmission?.payload.cardCount === "number"
    ? activeSubmission.payload.cardCount
    : 8;
  const ranking = [...classmates].sort((a, b) => b.session_score - a.session_score || a.joined_at.localeCompare(b.joined_at));
  const ownRank = ranking.findIndex((item) => item.id === student.id) + 1;
  const studentNav = <Navbar studentContext={{ sessionTitle: session.title, week: session.selected_week, studentName: student.nickname, studentNumber: student.student_number, score: student.session_score, onLeave: () => { localStorage.removeItem(`system-lab:${pin}:student`); router.push("/"); } }} />;

  if (shouldShowFeedback && activeSubmission) return <>{studentNav}<main className="container page student-submission-wait-page">
    <section className="student-submission-wait panel"><ModuleFeedbackSurvey key={activeModuleKey} moduleId={session.current_module} onSubmit={sendFeedback} onSkip={closeFeedback} /></section>
  </main></>;

  if (!session.is_active && !isAnswerReviewing) return <>{studentNav}<main className="container page"><div className="student-result-card panel"><Trophy size={58} color="var(--amber)" /><span className="eyebrow">Oturum tamamlandı</span><h1>Harika iş çıkardın!</h1><p className="lead">Genel toplam puanın <strong className="score-pop">{profile?.total_score ?? student.score}</strong></p><Button onClick={() => router.push("/")}>Ana sayfaya dön</Button></div></main></>;

  const isSupportedModule = session.selected_week === 1
    || (session.selected_week === 3 && (session.current_module === 1 || session.current_module === 2 || session.current_module === 3))
    || (session.selected_week === 4 && (session.current_module === 1 || session.current_module === 2 || session.current_module === 3));
  if (!isSupportedModule) return <>{studentNav}<main className="container page"><div className="student-waiting-card panel"><span className="waiting-illustration">🚧</span><span className="eyebrow">Hafta {session.selected_week}</span><h1>Yeni içerikler hazırlanıyor</h1><p>Bu haftanın modülleri ve interaktif içerikleri yakında eklenecektir.</p><div className="waiting-pulse"><i /> Öğretmenin yönlendirmesini bekleyin</div></div></main></>;

  if (!isAnswerReviewing && resultsRevealed && !activeSubmission) return <>{studentNav}<main className="container page"><section className="student-waiting-card panel"><span className="waiting-illustration">⏳</span><span className="eyebrow">Sonuç hazırlanıyor</span><h1>Puanın hesaplanıyor…</h1><div className="waiting-pulse"><i /> Sonuç kaydı alınıyor</div></section></main></>;

  if (!isAnswerReviewing && resultsRevealed) return <>{studentNav}<main className="container page student-result-page">
    <section className="student-result-card panel">
      <div className="result-spark"><Sparkles size={30} /></div>
      <span className="result-trophy">🏆</span>
      <span className="eyebrow">Modül {session.current_module} · {session.current_module_turn}. Oynanış sonucu</span>
      <h1>{activeCompletionStatus === "completed" ? <>Tebrikler, <strong>{scoreEarned} puan</strong> aldın!</> : <>Bu turda <strong>{scoreEarned} puan</strong> topladın.</>}</h1>
      <span className={`student-result-status ${activeCompletionStatus}`}>{activeCompletionStatus === "completed" ? "Modül tamamlandı" : "Modül tamamlanmadı"}</span>
      {firstCheckCorrect !== null && <p className="first-check-result">İlk kontrolde doğru: <strong>{firstCheckCorrect}/{firstCheckTotal}</strong></p>}
      <div className="student-mini-leaderboard">
        <strong className="mini-leaderboard-title"><Trophy size={18} /> Canlı Liderlik</strong>
        <ol>{ranking.slice(0, 3).map((item, index) => <li key={item.id} className={item.id === student.id ? "is-me" : ""}><span aria-hidden="true">{["🥇", "🥈", "🥉"][index]}</span><b><span>{index + 1}. </span><span data-i18n-skip>{item.nickname}</span></b><strong>{item.session_score} puan</strong></li>)}</ol>
        <div className="own-rank"><span><small>Senin sıran</small><b>{ownRank ? `${ownRank}.` : "—"}</b></span><strong><small>Oturum puanın</small>{student.session_score} puan</strong></div>
      </div>
      {message && <div className="notice success">{message}{saving ? " · kaydediliyor" : ""}</div>}
      {error && <div className="notice error">{error}</div>}
      <div className="next-module-wait"><Radio size={18} /><span>Öğretmen bir sonraki modülü başlatana kadar beklemede kalın…</span></div>
    </section>
  </main></>;

  if (!isAnswerReviewing && activeSubmission) return <>{studentNav}<main className="container page student-submission-wait-page">
    <section className="student-submission-wait panel">
      <>
        <span className="submission-check" aria-hidden="true">✓</span>
        <span className="eyebrow">Yanıt Alındı</span>
        <h1>Yanıtınız Kaydedildi!</h1>
        <p>Öğretmen turu bitirene kadar bekleyin. Hız bonusunuz tur kapanınca kesinleşecektir.</p>
        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}
        {!feedbackKeys.includes(activeModuleKey) && feedbackDismissedKey !== activeModuleKey && <button type="button" className="feedback-reopen" onClick={() => setFeedbackOpen(true)}><MessageCircleHeart size={18} /> Geri bildirim ver</button>}
        <div className="waiting-pulse"><i /> Sonuçlar henüz gizli</div>
      </>
    </section>
  </main></>;

  if (!isAnswerReviewing && !session.is_module_started) return <>{studentNav}<main className="container page"><section className="student-waiting-card panel"><span className="waiting-illustration">⏳</span><span className="eyebrow">Hafta {session.selected_week} · Modül {session.current_module}{session.current_module_turn > 0 ? ` · ${session.current_module_turn}. Oynanış` : ""}</span><h1>Öğretmen modülü başlatmak üzere…</h1><p>Lütfen bekleyin! Etkinlik başladığında ekranınız otomatik olarak açılacak.</p><div className="waiting-pulse"><i /> Canlı bağlantı açık</div></section></main></>;

  const countdownTimeLeft = getRemainingCountdown(session.module_started_at);
  if (!isAnswerReviewing && !activeSubmission && session.module_started_at && countdownTimeLeft > 0 && readyModuleKey !== activeModuleKey) return <>{studentNav}<ModuleStartCountdown key={`${activeModuleKey}:${session.module_started_at}`} weekId={session.selected_week} moduleId={session.current_module} startedAt={session.module_started_at} onComplete={() => setReadyModuleKey(activeModuleKey)} /></>;

  const modules = {
    1: <Module1SystemBuild key={activeModuleKey} existingSubmission={activeSubmission} existingDraft={activeDraft} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(1, draft)} onSubmit={(submission) => submit(1, submission)} />,
    2: <Module2Relations key={activeModuleKey} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(2, draft)} onSubmit={(submission) => submit(2, submission)} />,
    3: <Module3Boundary key={activeModuleKey} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(3, draft)} onSubmit={(submission) => submit(3, submission)} />,
    4: <Module4CompleteSystem key={activeModuleKey} existingSubmission={activeSubmission} existingDraft={activeDraft} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(4, draft)} onSubmit={(submission) => submit(4, submission)} />,
    5: <Module5RelationBalloons key={activeModuleKey} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(5, draft)} onSubmit={(submission) => submit(5, submission)} />,
  };
  const activeModule = session.selected_week === 3 && session.current_module === 1
    ? <Week3ProcessHierarchy key={activeModuleKey} sessionId={`${session.id}:${session.current_run_number}`} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(1, draft)} onSubmit={(submission) => submit(1, submission)} />
    : session.selected_week === 3 && session.current_module === 2
      ? <Week3MissingProcess key={activeModuleKey} sessionId={`${session.id}:${session.current_run_number}`} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(2, draft)} onSubmit={(submission) => submit(2, submission)} />
      : session.selected_week === 3 && session.current_module === 3
        ? <Week3FlowchartSymbols key={activeModuleKey} sessionId={`${session.id}:${session.current_run_number}`} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(3, draft)} onSubmit={(submission) => submit(3, submission)} />
      : session.selected_week === 4 && session.current_module === 1
        ? <Week4FactoryTransform key={activeModuleKey} seedKey={`${session.id}:${student.id}:4:1:${session.current_run_number}`} existingDraft={activeDraft} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(1, draft)} onSubmit={(submission) => submit(1, submission)} />
      : session.selected_week === 4 && session.current_module === 2
        ? <Week4BossApproach key={activeModuleKey} seedKey={`${session.id}:${student.id}:4:2:${session.current_run_number}`} existingDraft={activeDraft} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onDraft={(draft) => saveDraft(2, draft)} onSubmit={(submission) => submit(2, submission)} />
      : session.selected_week === 4 && session.current_module === 3
        ? <Week4SystemProcess key={activeModuleKey} seedKey={`${session.id}:${student.id}:4:3:${session.current_run_number}`} existingDraft={activeDraft} existingSubmission={activeSubmission} forceSubmit={session.module_stage === 4} onReviewStart={beginAnswerReview} onDraft={(draft) => saveDraft(3, draft)} onSubmit={(submission) => submit(3, submission)} />
      : modules[session.current_module];

  return <>{studentNav}<main className="container student-module-page stack">
    {message && <div className="notice success">{message}{saving ? " · kaydediliyor" : ""}</div>}
    {error && <div className="notice error">{error}</div>}
    {activeModule}
  </main></>;
}
