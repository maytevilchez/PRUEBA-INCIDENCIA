const url = 'https://vtstevswxrssramrouco.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0c3RldnN3eHJzc3JhbXJvdWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDMxNzMsImV4cCI6MjEwMDIxOTE3M30.ApjoyGJVESkqSgG784IJrpadDMR4lxEqn1ikXIMO0QI';

(async () => {
  try {
    const payload = [{
      employee_key: 'TEST-A',
      employee_name: 'Prueba',
      area: 'TI',
      dni: '00000000',
      hire_date: '01/01/2024',
      photo_url: '',
      updated_at: new Date().toISOString()
    }];

    const res = await fetch(`${url}/rest/v1/employee_profiles?on_conflict=employee_key`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    console.log('status', res.status, res.statusText);
    console.log('body', await res.text());
  } catch (e) {
    console.error('error', e.stack || e);
  }
})();
