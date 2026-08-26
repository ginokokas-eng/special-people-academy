/**
 * A certificate as something you hold up: dark ground, high contrast, large
 * type, readable at arm's length across a corridor. Cached locally, so it
 * renders with no signal.
 */
export const WalletCertificate = ({
  title,
  issuedOn,
  expiresOn,
  certificateNumber,
  inDate,
  onShow,
  onShare,
}: {
  title: string;
  /** Preformatted, e.g. "2 Aug 2026" */
  issuedOn: string;
  expiresOn: string;
  certificateNumber: string;
  inDate: boolean;
  onShow: () => void;
  onShare: () => void;
}) => (
  <article className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(150deg,#241A50,#141030)] p-5 shadow-[0_18px_40px_-20px_rgba(20,10,60,0.55)]">
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <img src="/brand/logo.png" alt="" className="h-[30px] w-[30px] object-contain" />
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${inDate ? 'bg-white/15 text-[#D9F5E7]' : 'bg-[var(--sp-danger)]/20 text-[#FFD9D6]'}`}>
          {inDate ? 'In date' : 'Expired'}
        </span>
      </div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Certificate of completion</p>
      <h2 className="mb-4 font-display text-2xl leading-tight text-white">{title}</h2>
      <div className="mb-[18px] flex gap-6">
        <span>
          <span className="block text-[10px] uppercase tracking-[0.1em] text-white/55">Issued</span>
          <span className="block text-sm text-white">{issuedOn}</span>
        </span>
        <span>
          <span className="block text-[10px] uppercase tracking-[0.1em] text-white/55">Expires</span>
          <span className="block text-sm text-white">{expiresOn}</span>
        </span>
      </div>
      <p className="mb-[18px] font-mono text-[13px] tracking-[0.06em] text-white/80">{certificateNumber}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onShow} className="pressable h-11 flex-1 rounded-full bg-white text-sm font-semibold text-[var(--sp-ink)]">
          Show to manager
        </button>
        <button type="button" onClick={onShare} aria-label="Share certificate" className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white">
          <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v13" /><path d="m16 6-4-4-4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          </svg>
        </button>
      </div>
    </div>
  </article>
);
