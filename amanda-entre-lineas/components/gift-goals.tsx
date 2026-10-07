"use client";
import { useEffect, useState } from "react";
import { Gift, Heart, Check, ExternalLink, ImagePlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { GiftGoal, formatPrice } from "@/lib/types";

export function GoalImage({
  goal,
}: {
  goal: Pick<GiftGoal, "image_url" | "title">;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [goal.image_url]);
  return goal.image_url && !failed ? (
    <img
      src={goal.image_url}
      alt={goal.title}
      loading="lazy"
      width="600"
      height="450"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="goal-image-empty" aria-label="Sin imagen">
      <ImagePlus size={34} strokeWidth={1.2} />
    </div>
  );
}
export function GoalProgress({ goal }: { goal: GiftGoal }) {
  const percent = Math.min(
    100,
    Math.floor((goal.collected_amount / goal.target_amount) * 100),
  );
  return (
    <div className="goal-progress">
      <div className="goal-amounts">
        <p>
          <strong>{formatPrice(goal.collected_amount)}</strong>
          <span>reunidos de {formatPrice(goal.target_amount)}</span>
        </p>
        <span className="goal-percent">{percent}%</span>
      </div>
      <Progress
        value={percent}
        aria-label={`Avance de ${goal.title}`}
        aria-valuetext={`${formatPrice(goal.collected_amount)} de ${formatPrice(goal.target_amount)}`}
      />
    </div>
  );
}
export default function GiftGoals({
  initialGoals,
  name,
  loadError = false,
}: {
  initialGoals: GiftGoal[];
  name: string;
  loadError?: boolean;
}) {
  const [goals, setGoals] = useState(initialGoals),
    [error, setError] = useState(loadError);
  useEffect(() => {
    async function refresh() {
      try {
        const r = await fetch("/api/goals", { cache: "no-store" });
        if (r.ok) {
          const data = (await r.json()) as { goals: GiftGoal[] };
          setGoals(data.goals);
          setError(false);
        }
      } catch {}
    }
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 60000);
    return () => {
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(timer);
    };
  }, []);
  return (
    <section
      id="suenos"
      className="dream-section"
      aria-labelledby="dream-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Heart size={14} /> UN REGALO ENTRE VARIAS PERSONAS
          </p>
          <h2 id="dream-title">Una vaquita, muchas historias</h2>
        </div>
      </div>
      <p className="dream-section-intro">
        Una Kindle o Kobo para llevar mis historias a todas partes, una edición
        especial o ese detalle mágico que me hace ilusión. Si te tinca, podemos
        hacerlo realidad entre varias personas.
      </p>
      {error ? (
        <div className="empty-state goals-empty">
          <Heart size={29} />
          <h3>No pudimos cargar las vaquitas</h3>
          <p>Vuelve a intentar para ver las metas y sus links de aporte.</p>
          <button className="btn outline" onClick={() => location.reload()}>
            Volver a intentar
          </button>
        </div>
      ) : !goals.length ? (
        <div className="empty-state goals-empty">
          <Heart size={31} strokeWidth={1.2} />
          <h3>El próximo sueño todavía se está eligiendo</h3>
          <p>
            Por ahora no hay vaquitas abiertas. Mientras, puedes encontrar un
            regalo entre mis libros y los otros detallitos de la wishlist.
          </p>
          <a className="btn outline" href="#wishlist">
            Ver mis libros
          </a>
        </div>
      ) : (
        <div className="dream-grid">
          {goals.map((goal) => (
            <article
              className={`dream-card ${goal.status === "completed" ? "goal-completed" : ""}`}
              key={goal.id}
            >
              <div className="goal-image">
                <GoalImage goal={goal} />
                <span className="goal-state">
                  {goal.status === "completed" ? (
                    <>
                      <Check size={15} /> Meta cumplida
                    </>
                  ) : (
                    <>
                      <Gift size={15} /> Una vaquita con cariño
                    </>
                  )}
                </span>
              </div>
              <div className="dream-copy">
                <h3>{goal.title}</h3>
                {goal.personal_note && (
                  <p className="goal-note">{goal.personal_note}</p>
                )}
                <GoalProgress goal={goal} />
                {goal.status === "completed" ? (
                  <p className="goal-thanks">
                    <Heart size={17} /> Este sueño ya tiene su próximo capítulo.
                    Gracias por hacerlo posible.
                  </p>
                ) : (
                  <>
                    <a
                      className="btn primary full-width"
                      href={goal.contribution_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Gift size={18} /> Aportar a este sueño{" "}
                      <ExternalLink size={15} />
                    </a>
                    <p className="goal-external-hint">
                      El aporte se realiza en otra página, a través del link
                      elegido por {name}.
                    </p>
                  </>
                )}
                <p className="goal-update">
                  Avance actualizado por {name} ·{" "}
                  <time dateTime={goal.updated_at}>
                    {new Intl.DateTimeFormat("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "America/Santiago",
                    }).format(new Date(goal.updated_at))}
                  </time>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
