const url = 'https://vtstevswxrssramrouco.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0c3RldnN3eHJzc3JhbXJvdWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDMxNzMsImV4cCI6MjEwMDIxOTE3M30.ApjoyGJVESkqSgG784IJrpadDMR4lxEqn1ikXIMO0QI';

(async () => {
  try {
    const payload = [{
      employee_id: null,
      equipment_name: 'Laptop de prueba',
      brand: 'MarcaX',
      model: 'X1',
      serial: 'SER123',
      system: 'Windows 11 Pro',
      hardware: { processor: 'Intel Core i5', ram: '8', disk: '256' },
      software: { system: 'Windows 11 Pro', architecture: '64 bits' },
      accessories: [
        { name: 'Mouse', model: 'Logi M100', serial: 'MOU123' },
        { name: 'Teclado', model: 'TecladoX', serial: 'TEC456' }
      ],
      action_taken: null,
      return_date: null,
      replacement_date: null,
      status: 'Pendiente'
    }];

    const res = await fetch(`${url}/rest/v1/equipment`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    console.log('status', res.status, res.statusText);
    console.log('body', await res.text());
  } catch (e) {
    console.error('error', e.stack || e);
  }
})();
