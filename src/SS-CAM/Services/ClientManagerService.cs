using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public class ClientProfile
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Name { get; set; } = "New Client";
        public string CodePrefix { get; set; } = "CLI";
        public string ContactEmail { get; set; } = "";
        public string ContactPerson { get; set; } = "";
        public string PrimaryColorHex { get; set; } = "#0078D4";
        public string SecondaryColorHex { get; set; } = "#2B88D8";
        public string AccentColorHex { get; set; } = "#60CDFF";
        public decimal HourlyRate { get; set; } = 50.00m;
        public string Currency { get; set; } = "USD";
        public string Notes { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ClientManagerService
    {
        private static ClientManagerService _instance;
        public static ClientManagerService Instance => _instance ??= new ClientManagerService();

        private readonly string _localConfigPath;
        private List<ClientProfile> _clients = new List<ClientProfile>();

        public ClientManagerService()
        {
            _localConfigPath = Path.Combine(AppPaths.AppDataFolder, "clients_config.json");
            LoadClients();
        }

        public List<ClientProfile> GetClients()
        {
            if (_clients == null || _clients.Count == 0)
            {
                _clients = GetDefaultFreelanceClients();
                SaveClients();
            }
            return _clients;
        }

        public void SaveClient(ClientProfile client)
        {
            if (client == null) return;
            var existing = _clients.FirstOrDefault(c => c.Id == client.Id);
            if (existing != null)
            {
                int index = _clients.IndexOf(existing);
                _clients[index] = client;
            }
            else
            {
                _clients.Add(client);
            }
            SaveClients();
        }

        public void DeleteClient(string clientId)
        {
            _clients.RemoveAll(c => c.Id == clientId);
            SaveClients();
        }

        public void LoadClients()
        {
            try
            {
                if (File.Exists(_localConfigPath))
                {
                    string json = File.ReadAllText(_localConfigPath);
                    var loaded = JsonConvert.DeserializeObject<List<ClientProfile>>(json);
                    if (loaded != null && loaded.Count > 0)
                    {
                        _clients = loaded;
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ClientManagerService] Load error: " + ex.Message);
            }

            _clients = GetDefaultFreelanceClients();
            SaveClients();
        }

        public void SaveClients()
        {
            try
            {
                string dir = Path.GetDirectoryName(_localConfigPath);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                string json = JsonConvert.SerializeObject(_clients, Formatting.Indented);
                File.WriteAllText(_localConfigPath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ClientManagerService] Save error: " + ex.Message);
            }
        }

        public static List<ClientProfile> GetDefaultFreelanceClients()
        {
            return new List<ClientProfile>
            {
                new ClientProfile
                {
                    Name = "Personal Projects",
                    CodePrefix = "PERS",
                    PrimaryColorHex = "#0078D4",
                    SecondaryColorHex = "#2B88D8",
                    AccentColorHex = "#60CDFF",
                    Notes = "Internal personal projects, experiments & portfolio work.",
                    HourlyRate = 0,
                    Currency = "USD"
                },
                new ClientProfile
                {
                    Name = "Acme Studio",
                    CodePrefix = "ACME",
                    ContactPerson = "Sarah Connor",
                    ContactEmail = "sarah@acmestudio.design",
                    PrimaryColorHex = "#8B5CF6",
                    SecondaryColorHex = "#A78BFA",
                    AccentColorHex = "#C4B5FD",
                    Notes = "Brand identity retainer & social marketing creative.",
                    HourlyRate = 75.00m,
                    Currency = "USD"
                },
                new ClientProfile
                {
                    Name = "HyperNova Tech",
                    CodePrefix = "NOVA",
                    ContactPerson = "Alex Rivera",
                    ContactEmail = "alex@hypernova.io",
                    PrimaryColorHex = "#06B6D4",
                    SecondaryColorHex = "#22D3EE",
                    AccentColorHex = "#67E8F9",
                    Notes = "SaaS product UI design, landing pages & video assets.",
                    HourlyRate = 90.00m,
                    Currency = "USD"
                }
            };
        }
    }
}
