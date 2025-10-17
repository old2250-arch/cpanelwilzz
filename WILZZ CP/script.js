let config;

async function loadConfig() {
  const res = await fetch("config.json");
  config = await res.json();
}

function randomPassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => chars[x % chars.length])
    .join('');
}

async function createUser(username, password) {
  const body = {
    email: `${username}@example.com`,
    username,
    first_name: username,
    last_name: "User",
    password
  };

  const res = await fetch(`${config.DOMAIN}/api/application/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.API_KEY}`,
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error("Gagal membuat user");
  const data = await res.json();
  return data.attributes.id;
}

async function createServer(userId, name, ram) {
  const limits = ram === "unlimited"
    ? { memory: 0, disk: 0 }
    : { memory: parseInt(ram), disk: parseInt(ram) * 2 };

  const body = {
    name,
    user: userId,
    egg: parseInt(config.EGG_ID),
    docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
    startup: "npm start",
    environment: {},
    limits,
    feature_limits: { databases: 1, allocations: 1, backups: 1 },
    allocation: { default: 1 },
    location: parseInt(config.LOCATION_ID)
  };

  const res = await fetch(`${config.DOMAIN}/api/application/servers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.API_KEY}`,
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error("Gagal membuat server");
  return res.json();
}

async function loadServers() {
  const res = await fetch(`${config.DOMAIN}/api/application/servers`, {
    headers: { "Authorization": `Bearer ${config.API_KEY}` }
  });
  const data = await res.json();

  const table = document.getElementById("serverTable");
  table.innerHTML = "";

  data.data.forEach(s => {
    const name = s.attributes.name;
    const id = s.attributes.id;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${id}</td>
      <td>${config.DOMAIN}</td>
      <td>${name}</td>
      <td>—</td>
      <td>✅ Aktif</td>
    `;
    table.appendChild(row);
  });
}

async function init() {
  await loadConfig();
  await loadServers();

  document.getElementById("createBtn").addEventListener("click", async () => {
    const name = document.getElementById("serverName").value.trim();
    const ram = document.getElementById("ramSelect").value;
    const status = document.getElementById("status");

    if (!name) return (status.textContent = "❌ Nama server wajib diisi.");

    const username = name.toLowerCase().replace(/\s/g, "") + Math.floor(Math.random() * 1000);
    const password = randomPassword(10);

    status.textContent = "⏳ Membuat user...";
    try {
      const userId = await createUser(username, password);
      status.textContent = "⚙️ Membuat server...";
      await createServer(userId, name, ram);
      status.textContent = `✅ Server berhasil dibuat!
      \nDomain: ${config.DOMAIN}
      \nUsername: ${username}
      \nPassword: ${password}`;

      await loadServers();
    } catch (e) {
      status.textContent = "❌ Gagal membuat server: " + e.message;
    }
  });
}

init();