"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircleHeart, Send, Star } from "lucide-react";
import { Button } from "@/components/common/Button";

type FeedbackInput = {
  funRating: number;
  difficultyRating: number;
  comment: string;
};

type ModuleFeedbackSurveyProps = {
  moduleId: number;
  onSubmit: (input: FeedbackInput) => Promise<void>;
  onSkip: () => void;
};

export function ModuleFeedbackSurvey({ moduleId, onSubmit, onSkip }: ModuleFeedbackSurveyProps) {
  const [funRating, setFunRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(50);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submitFeedback() {
    if (!funRating || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit({ funRating, difficultyRating, comment });
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Geri bildirim gönderilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (complete) return <section className="feedback-survey feedback-complete" aria-live="polite">
    <CheckCircle2 size={46} />
    <h2>Teşekkürler!</h2>
    <p>Geri bildirimin kaydedildi. Puanın bundan etkilenmez.</p>
    <Button type="button" size="small" onClick={onSkip}>Bekleme ekranına dön</Button>
  </section>;

  return <section className="feedback-survey" aria-labelledby="feedback-title">
    <div className="feedback-heading">
      <span><MessageCircleHeart size={24} /></span>
      <div><small>Modül {moduleId}</small><h2 id="feedback-title">🎉 Modül tamamlandı!</h2></div>
    </div>
    <p className="feedback-intro">Kısa geri bildirimin etkinliği geliştirmemize yardım eder. Puanını etkilemez.</p>

    <fieldset className="feedback-fieldset">
      <legend>Bu modül ne kadar eğlenceliydi?</legend>
      <div className="feedback-stars" role="radiogroup" aria-label="Eğlence puanı">
        {[1, 2, 3, 4, 5].map((rating) => <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={funRating === rating}
          aria-label={`${rating} yıldız`}
          className={rating <= funRating ? "active" : ""}
          onClick={() => setFunRating(rating)}
        ><Star size={32} fill="currentColor" /></button>)}
      </div>
    </fieldset>

    <label className="feedback-range">
      <span><strong>Zorluk düzeyi</strong><b>{difficultyRating}</b></span>
      <input type="range" min="0" max="100" step="1" value={difficultyRating} onChange={(event) => setDifficultyRating(Number(event.target.value))} />
      <small><span>Çok kolay</span><span>Çok zor</span></small>
    </label>

    <label className="feedback-comment">
      <span>💡 Bu oyunda neyi değiştirirdin? <small>(isteğe bağlı)</small></span>
      <textarea maxLength={500} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Kısa yorumun…" />
      <small>{comment.length}/500</small>
    </label>

    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="feedback-actions">
      <button type="button" className="feedback-skip" onClick={onSkip} disabled={saving}>Atla</button>
      <Button type="button" size="small" icon={<Send size={17} />} loading={saving} disabled={!funRating} onClick={() => void submitFeedback()}>Gönder</Button>
    </div>
  </section>;
}
