import { useMemo, useState } from 'react'
import { SIMS } from './catalog.js'

const grid = Array.from({ length: 7 }, (_, i) => 20 + i * 33)

// Ilustrasi kartu: gambar sederhana, mengikuti warna tema
function Thumb({ id }) {
  return (
    <svg viewBox="0 0 240 140" role="img" aria-hidden="true" className="thumb">
      <g stroke="var(--line)" strokeWidth="1">
        {grid.map((v) => <path key={'v' + v} d={`M${v} 6V134`} />)}
        {[26, 59, 92, 125].map((v) => <path key={'h' + v} d={`M8 ${v}H232`} />)}
      </g>
      <path d="M8 92H232M119 6V134" stroke="var(--muted)" strokeWidth="1.2" />
      {id === 'kuadrat' ? (
        <>
          <path d="M119 28V134" stroke="var(--muted)" strokeDasharray="4 4" />
          <path d="M44 12Q119 190 194 12" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="119" cy="101" r="5" fill="var(--text)" />
          <circle cx="74" cy="60" r="4.5" fill="#4a7ba6" /><circle cx="164" cy="60" r="4.5" fill="#4a7ba6" />
        </>
      ) : (
        <>
          <path d="M146 62H210L170 18z" fill="rgba(198,97,63,.12)" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M26 122H90L50 78z" fill="rgba(61,57,41,.1)" stroke="var(--text)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M94 104Q126 84 142 70" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeDasharray="4 4" />
          <path d="M138 66l7 3-3-8z" fill="var(--muted)" />
        </>
      )}
    </svg>
  )
}

export default function Landing() {
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('Semua')
  const subjects = useMemo(() => ['Semua', ...new Set(SIMS.map((s) => s.subject))], [])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return SIMS.filter((s) => (subject === 'Semua' || s.subject === subject) && (!t || [s.title, s.desc, s.subject, ...s.tags].join(' ').toLowerCase().includes(t)))
  }, [q, subject])

  return (
    <div className="lp">
      <header className="lh"><div className="brand"><i>✻</i>Anthromath</div></header>

      <main className="lm">
        <section className="hero">
          <h1>Belajar lewat simulasi interaktif</h1>
          <p>Geser, ubah, dan amati. Pilih simulasi untuk mulai, lalu bagikan tautannya ke siswa.</p>
          <div className="find">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari simulasi, mis. parabola" aria-label="Cari simulasi" />
          </div>
          {subjects.length > 2 && (
            <div className="subj" role="group" aria-label="Mata pelajaran">
              {subjects.map((s) => <button key={s} aria-pressed={subject === s} onClick={() => setSubject(s)}>{s}</button>)}
            </div>
          )}
        </section>

        <section className="cards" aria-label="Daftar simulasi">
          {list.map((s) => (
            <a key={s.id} className="card" href={s.href}>
              <Thumb id={s.id} />
              <div className="cb">
                <div className="meta"><span>{s.subject}</span><span>{s.level}</span></div>
                <h2>{s.title}</h2>
                <p>{s.desc}</p>
                <div className="tags">{s.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <span className="go">Buka simulasi →</span>
              </div>
            </a>
          ))}
          {!q && subject === 'Semua' && <div className="card soon"><b>Segera hadir</b><span>Simulasi untuk materi dan mata pelajaran lain.</span></div>}
        </section>
        {list.length === 0 && <p className="none">Tidak ada simulasi yang cocok dengan “{q}”.</p>}
      </main>
    </div>
  )
}
