import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// =====================================================
// SUPABASE CONFIG
// =====================================================
const SUPABASE_URL = 'https://wnrqfrwsnjjqpgkcship.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_X966BS58oHpJXAZp4a6EPw_M2qIFXY4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// =====================================================
// SESSION HELPERS
// =====================================================
function getSessionId() {
    let id = sessionStorage.getItem('session_id')
    if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem('session_id', id)
    }
    return id
}

function getDailyVisitorKey() {
    const day = new Date().toISOString().split('T')[0]
    return `${navigator.userAgent}_${day}`
}

function now() {
    return new Date().toISOString()
}

// =====================================================
// PAGE VIEW TRACKING
// =====================================================
async function trackPageView() {
    const page = window.location.pathname

    sessionStorage.setItem('page_enter_time', Date.now())

    const { error } = await supabase.from('events').insert([{
        event_type: 'page_view',
        page,
        session_id: getSessionId(),
        visitor_key: getDailyVisitorKey(),
        user_agent: navigator.userAgent,
        created_at: now()
    }])

    if (error) {
        console.error('Page view error:', error.message)
    }
}

window.addEventListener('load', trackPageView)

// =====================================================
// TIME ON PAGE (fires on leave)
// =====================================================
window.addEventListener('beforeunload', async () => {
    const enterTime = sessionStorage.getItem('page_enter_time')
    if (!enterTime) return

    const durationSeconds = Math.round((Date.now() - enterTime) / 1000)

    const { error } = await supabase.from('events').insert([{
        event_type: 'time_on_page',
        page: window.location.pathname,
        session_id: getSessionId(),
        value: durationSeconds,
        created_at: now()
    }])

    if (error) {
        console.error('Time-on-page error:', error.message)
    }
})

// =====================================================
// CLICK TRACKING
// =====================================================
document.addEventListener('click', async (e) => {
    const target = e.target.closest('a, button')
    if (!target) return

    const label =
        target.innerText?.trim() ||
        target.getAttribute('aria-label') ||
        target.getAttribute('href') ||
        'unknown'

    const { error } = await supabase.from('events').insert([{
        event_type: 'click',
        page: window.location.pathname,
        label,
        session_id: getSessionId(),
        created_at: now()
    }])

    if (error) {
        console.error('Click error:', error.message)
    }
})
