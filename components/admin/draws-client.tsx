"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, cleanError } from "./ui";
import { dateFmt, winnn } from "@/lib/format";

function youtubeId(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  if (s.indexOf("/") === -1 && s.indexOf("?") === -1) return s;
  let m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = s.match(/embed\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return s;
}

export default function DrawsClient(props: { campaigns: any[]; draws: any[] }) {
  const [sel, setSel] = useState<string>(props.campaigns.length ? props.campaigns[0].id : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [serial, setSerial] = useState("");
  const [position, setPosition] = useState("1");
  const [video, setVideo] = useState("");
  const router = useRouter();

  const campaign = props.campaigns.find((c) => c.id === sel);
  const draw = props.draws.find((d) => d.campaign_id === sel);
  const prizes: any[] = campaign ? ((campaign.campaign_prizes as any[]) || []).slice().sort((a, b) => a.position - b.position) : [];
  const winners: any[] = draw ? ((draw.draw_winners as any[]) || []).slice().sort((a, b) => a.position - b.position) : [];
  const pulls: any[] = draw ? ((draw.draw_pulls as any[]) || []).slice().sort((a, b) => b.attempt_no - a.attempt_no) : [];

  async function call(fn: string, args: any, okText: string) {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc(fn, args);
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return null; }
    setMsg({ kind: "ok", text: okText });
    router.refresh();
    return res.data;
  }

  async function recordPull() {
    const d: any = await call(
      "fn_record_draw_pull",
      { p_draw_id: draw.id, p_prize_position: parseInt(position, 10), p_serial: serial },
      "Pull recorded."
    );
    if (d && d.result === "INVALID") {
      setMsg({
        kind: "error",
        text: "Invalid pull recorded (" + d.reason + "). Draw again and enter the next serial.",
      });
    } else if (d) {
      setMsg({
        kind: "ok",
        text:
          "Winner recorded: " + d.serial + " (" + d.source + "). " +
          (d.claim_status === "AWAITING_CLAIM"
            ? "This voucher was never scanned, so it is awaiting a claim."
            : "Owner is known."),
      });
      setSerial("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Draws</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          The drum decides the winner. This screen records what happened, it does not pick anything.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Card title="Campaign">
        <select className={FIELD} value={sel} onChange={(e) => { setSel(e.target.value); setMsg(null); }}>
          <option value="">Choose a campaign</option>
          {props.campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
          ))}
        </select>
      </Card>

      {campaign ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { l: "Status", v: campaign.status },
              { l: "Draw date", v: dateFmt(campaign.draw_date) },
              { l: "In drum", v: draw ? draw.pool_total_count : "-" },
              { l: "Store copies", v: draw ? draw.store_copies_received : "-" },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{k.l}</p>
                <p className="num mt-2 font-headline text-headline-sm text-on-surface">{k.v}</p>
              </div>
            ))}
          </div>

          <Card title="Step 1 - Close entries and freeze the drum">
            <p className="mb-5 font-body text-body-md text-on-surface-variant">
              This stops all new tickets and snapshots the pool. Print the online serials only after
              this, otherwise the drum will not match the ledger.
            </p>
            {draw ? (
              <div className="rounded-xl bg-tertiary-fixed/20 p-4">
                <p className="num font-body text-body-md text-on-tertiary-fixed">
                  Pool frozen {dateFmt(draw.sales_closed_at)} - {draw.pool_online_count} online +{" "}
                  {draw.pool_offline_count} in store = {draw.pool_total_count} slips.
                </p>
              </div>
            ) : (
              <Btn
                onClick={() => call("fn_close_campaign_sales", { p_campaign_id: sel }, "Entries closed and pool frozen.")}
                disabled={busy}
              >
                Close entries
              </Btn>
            )}
          </Card>

          {draw ? (
            <Card title="Step 2 - Record each physical pull">
              <div className="mb-5 rounded-xl bg-secondary-container/30 p-4">
                <p className="font-body text-body-md text-on-surface">
                  Read the serial from the slip drawn out of the drum and enter it exactly. Invalid
                  pulls are recorded too, so the audit trail matches the video.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="Prize position">
                  <select className={FIELD} value={position} onChange={(e) => setPosition(e.target.value)}>
                    {(prizes.length ? prizes : [{ position: 1, title: "Prize 1" }]).map((p) => (
                      <option key={p.position} value={p.position}>
                        {p.position} - {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Serial drawn">
                  <input className={FIELD + " num uppercase"} placeholder={campaign.serial_prefix + "-000123"}
                    value={serial} onChange={(e) => setSerial(e.target.value)} />
                </Field>
                <div className="flex items-end">
                  <Btn onClick={recordPull} disabled={busy || !serial}>Record pull</Btn>
                </div>
              </div>

              {pulls.length ? (
                <div className="mt-8">
                  <p className="mb-3 font-label text-label-bold text-on-surface-variant">Pull history</p>
                  <div className="space-y-2">
                    {pulls.map((p) => (
                      <div key={p.attempt_no}
                        className="flex items-center justify-between rounded-xl bg-surface-container p-3">
                        <div className="flex items-center gap-3">
                          <span className="num font-label text-[11px] text-on-surface-variant">#{p.attempt_no}</span>
                          <span className="num font-label text-label-bold text-on-surface">{p.serial_entered}</span>
                          <span className="font-body text-sm text-on-surface-variant">Prize {p.prize_position}</span>
                        </div>
                        <Pill tone={p.result === "VALID"
                          ? "bg-tertiary-fixed/40 text-on-tertiary-fixed"
                          : "bg-error-container text-on-error-container"}>
                          {p.result === "VALID" ? "Valid" : p.reason}
                        </Pill>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          {draw && winners.length ? (
            <Card title="Step 3 - Confirm and publish">
              <div className="mb-6 space-y-3">
                {winners.map((w) => {
                  const prize = prizes.find((p) => p.position === w.position);
                  return (
                    <div key={w.position}
                      className="flex items-center justify-between rounded-xl bg-primary-container p-4 text-on-primary-container">
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-widest opacity-70">
                          Prize {w.position} {prize ? " - " + prize.title : ""}
                        </p>
                        <p className="num mt-1 font-headline text-headline-sm text-secondary-fixed">
                          {w.tickets ? w.tickets.serial : "-"}
                        </p>
                      </div>
                      <Pill tone={w.claim_status === "AWAITING_CLAIM"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-tertiary-fixed/40 text-on-tertiary-fixed"}>
                        {w.claim_status === "AWAITING_CLAIM" ? "Awaiting claim" : "Confirmed"}
                      </Pill>
                    </div>
                  );
                })}
              </div>

              <Field label="YouTube link or ID" hint="Optional. Shown on the public results page.">
                <input className={FIELD} placeholder="https://youtube.com/watch?v=..."
                  value={video} onChange={(e) => setVideo(e.target.value)} />
              </Field>

              <div className="mt-5 flex flex-wrap gap-3">
                {draw.status === "RECORDED" ? (
                  <Btn onClick={() => call("fn_confirm_draw", { p_draw_id: draw.id }, "Draw confirmed.")} disabled={busy}>
                    Confirm result
                  </Btn>
                ) : null}
                {draw.status === "CONFIRMED" ? (
                  <Btn
                    onClick={() =>
                      call("fn_publish_draw",
                        { p_draw_id: draw.id, p_youtube_video_id: youtubeId(video) || null },
                        "Published. Losing tickets are now retired.")
                    }
                    disabled={busy}
                  >
                    Publish winner
                  </Btn>
                ) : null}
                {draw.status === "PUBLISHED" ? (
                  <div className="rounded-xl bg-tertiary-fixed/20 p-4">
                    <p className="font-body text-body-md text-on-tertiary-fixed">
                      Published {dateFmt(draw.published_at)}. Visible on the public results page.
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
