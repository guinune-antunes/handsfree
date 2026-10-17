using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Reflection;
using System.Diagnostics;
using System.Threading;

namespace DiscordCloneInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        // Colors
        private readonly Color ColorBg = Color.FromArgb(30, 31, 34);         // #1e1f22
        private readonly Color ColorCard = Color.FromArgb(43, 45, 49);       // #2b2d31
        private readonly Color ColorInput = Color.FromArgb(18, 18, 20);      // #121214
        private readonly Color ColorBlurple = Color.FromArgb(88, 101, 242);  // #5865f2
        private readonly Color ColorGreen = Color.FromArgb(35, 165, 90);     // #23a55a
        private readonly Color ColorRed = Color.FromArgb(237, 66, 69);       // #ed4245
        private readonly Color ColorText = Color.FromArgb(242, 243, 245);    // #f2f3f5
        private readonly Color ColorMuted = Color.FromArgb(148, 155, 164);   // #949ba4
        private readonly Color ColorBorder = Color.FromArgb(60, 63, 69);

        // Controls - Installation Phase
        private Panel panelInstalling;
        private Label lblHeaderTitle;
        private Label lblHeaderSubtitle;
        private Label lblStatus;
        private CustomProgressBar progressBar;
        private System.Windows.Forms.Timer animTimer;

        // Controls - Complete Phase
        private Panel panelComplete;
        private TextBox txtPixKey;
        private Button btnCopyPix;
        private Button btnLaunch;
        private Button btnDiag;
        private Button btnClose;

        // Controls - Error Phase
        private Panel panelError;
        private TextBox txtErrorDetails;
        private Button btnRunDiagOnError;
        private Button btnCloseOnError;

        private int progressValue = 0;
        private string installedExePath = "";
        private bool isExtractDone = false;
        private bool hasError = false;
        private string pixKey = "gui.antunes@live.com";

        public InstallerForm()
        {
            InitializeComponent();
            StartInstallation();
        }

        private void InitializeComponent()
        {
            this.Text = "Instalador — Discord Clone Leve";
            this.Size = new Size(580, 500);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = ColorBg;
            this.ForeColor = ColorText;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Carregar ícone do form
            try
            {
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (stream != null) this.Icon = new Icon(stream);
                }
            }
            catch { }

            // ============================================
            // PAINEL 1: INSTALANDO (ANIMAÇÃO)
            // ============================================
            panelInstalling = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = ColorBg
            };

            PictureBox picLogo = new PictureBox
            {
                Size = new Size(64, 64),
                Location = new Point(258, 40),
                SizeMode = PictureBoxSizeMode.Zoom
            };
            try
            {
                using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (s != null) picLogo.Image = new Icon(s, 64, 64).ToBitmap();
                }
            }
            catch { }

            lblHeaderTitle = new Label
            {
                Text = "Discord Clone Leve",
                Font = new Font("Segoe UI", 16f, FontStyle.Bold),
                ForeColor = ColorText,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 115),
                Size = new Size(500, 32)
            };

            lblHeaderSubtitle = new Label
            {
                Text = "Instalando o aplicativo no seu computador...",
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                ForeColor = ColorMuted,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 150),
                Size = new Size(500, 24)
            };

            progressBar = new CustomProgressBar
            {
                Location = new Point(50, 210),
                Size = new Size(480, 24),
                BarColor = ColorBlurple,
                BorderColor = ColorBorder
            };

            lblStatus = new Label
            {
                Text = "Iniciando instalação...",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = ColorMuted,
                TextAlign = ContentAlignment.MiddleLeft,
                Location = new Point(50, 245),
                Size = new Size(480, 24)
            };

            panelInstalling.Controls.Add(picLogo);
            panelInstalling.Controls.Add(lblHeaderTitle);
            panelInstalling.Controls.Add(lblHeaderSubtitle);
            panelInstalling.Controls.Add(progressBar);
            panelInstalling.Controls.Add(lblStatus);

            // ============================================
            // PAINEL 2: FINALIZADO + AGRADECIMENTO + PIX
            // ============================================
            panelComplete = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = ColorBg,
                Visible = false
            };

            Label lblSuccessIcon = new Label
            {
                Text = "🎉",
                Font = new Font("Segoe UI", 36f, FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 15),
                Size = new Size(500, 55)
            };

            Label lblSuccessTitle = new Label
            {
                Text = "Instalação Concluída com Sucesso!",
                Font = new Font("Segoe UI", 15f, FontStyle.Bold),
                ForeColor = ColorGreen,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 75),
                Size = new Size(500, 28)
            };

            Label lblThanks = new Label
            {
                Text = "Muito obrigado por instalar o Discord Clone Leve!\nO atalho oficial foi criado diretamente na sua Área de Trabalho.",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = ColorText,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 108),
                Size = new Size(500, 38)
            };

            // Card do PIX
            Panel cardPix = new Panel
            {
                Location = new Point(45, 155),
                Size = new Size(490, 150),
                BackColor = ColorCard
            };

            Label lblPixTitle = new Label
            {
                Text = "❤️ Gostou do projeto? Considere apoiar com um PIX!",
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                ForeColor = ColorText,
                Location = new Point(16, 10),
                Size = new Size(458, 22)
            };

            Label lblPixDesc = new Label
            {
                Text = "Sua contribuição ajuda a manter os servidores de voz e o desenvolvimento contínuo ativo. Qualquer valor faz a diferença!",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                ForeColor = ColorMuted,
                Location = new Point(16, 34),
                Size = new Size(458, 30)
            };

            Label lblPixKeyLabel = new Label
            {
                Text = "Chave PIX (E-mail):",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = ColorMuted,
                Location = new Point(16, 68),
                Size = new Size(458, 16)
            };

            txtPixKey = new TextBox
            {
                Text = pixKey,
                Location = new Point(16, 88),
                Size = new Size(310, 26),
                ReadOnly = true,
                BackColor = ColorInput,
                ForeColor = ColorText,
                BorderStyle = BorderStyle.FixedSingle,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold)
            };

            btnCopyPix = new Button
            {
                Text = "📋 Copiar Chave",
                Location = new Point(334, 86),
                Size = new Size(140, 30),
                BackColor = ColorBlurple,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCopyPix.FlatAppearance.BorderSize = 0;
            btnCopyPix.Click += BtnCopyPix_Click;

            cardPix.Controls.Add(lblPixTitle);
            cardPix.Controls.Add(lblPixDesc);
            cardPix.Controls.Add(lblPixKeyLabel);
            cardPix.Controls.Add(txtPixKey);
            cardPix.Controls.Add(btnCopyPix);

            // Botões de Ação Final
            btnLaunch = new Button
            {
                Text = "🚀 Abrir Discord Clone Leve",
                Location = new Point(45, 330),
                Size = new Size(270, 42),
                BackColor = ColorGreen,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLaunch.FlatAppearance.BorderSize = 0;
            btnLaunch.Click += (s, e) =>
            {
                if (File.Exists(installedExePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = installedExePath,
                        WorkingDirectory = Path.GetDirectoryName(installedExePath)
                    });
                }
                Application.Exit();
            };

            btnDiag = new Button
            {
                Text = "🔍 Diagnóstico",
                Location = new Point(325, 330),
                Size = new Size(110, 42),
                BackColor = ColorBlurple,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnDiag.FlatAppearance.BorderSize = 0;
            btnDiag.Click += (s, e) => RunDiagnostic();

            btnClose = new Button
            {
                Text = "Concluir",
                Location = new Point(445, 330),
                Size = new Size(90, 42),
                BackColor = ColorCard,
                ForeColor = ColorText,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.Click += (s, e) => Application.Exit();

            panelComplete.Controls.Add(lblSuccessIcon);
            panelComplete.Controls.Add(lblSuccessTitle);
            panelComplete.Controls.Add(lblThanks);
            panelComplete.Controls.Add(cardPix);
            panelComplete.Controls.Add(btnLaunch);
            panelComplete.Controls.Add(btnDiag);
            panelComplete.Controls.Add(btnClose);

            // ============================================
            // PAINEL 3: ERRO DETALHADO (SEM LACUNAS)
            // ============================================
            panelError = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = ColorBg,
                Visible = false
            };

            Label lblErrIcon = new Label
            {
                Text = "⚠️",
                Font = new Font("Segoe UI", 34f, FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 15),
                Size = new Size(500, 50)
            };

            Label lblErrTitle = new Label
            {
                Text = "Ocorreu um Erro Durante a Instalação",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = ColorRed,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 70),
                Size = new Size(500, 28)
            };

            Label lblErrSubtitle = new Label
            {
                Text = "Identificamos o problema abaixo para você não ficar com dúvidas:",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = ColorMuted,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 100),
                Size = new Size(500, 20)
            };

            txtErrorDetails = new TextBox
            {
                Location = new Point(45, 130),
                Size = new Size(490, 175),
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                ReadOnly = true,
                BackColor = ColorInput,
                ForeColor = ColorRed,
                Font = new Font("Consolas", 8.5f, FontStyle.Regular)
            };

            btnRunDiagOnError = new Button
            {
                Text = "🔍 Executar Diagnóstico Completo",
                Location = new Point(45, 330),
                Size = new Size(290, 42),
                BackColor = ColorBlurple,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnRunDiagOnError.FlatAppearance.BorderSize = 0;
            btnRunDiagOnError.Click += (s, e) => RunDiagnostic();

            btnCloseOnError = new Button
            {
                Text = "Fechar",
                Location = new Point(345, 330),
                Size = new Size(190, 42),
                BackColor = ColorCard,
                ForeColor = ColorText,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnCloseOnError.FlatAppearance.BorderSize = 0;
            btnCloseOnError.Click += (s, e) => Application.Exit();

            panelError.Controls.Add(lblErrIcon);
            panelError.Controls.Add(lblErrTitle);
            panelError.Controls.Add(lblErrSubtitle);
            panelError.Controls.Add(txtErrorDetails);
            panelError.Controls.Add(btnRunDiagOnError);
            panelError.Controls.Add(btnCloseOnError);

            this.Controls.Add(panelError);
            this.Controls.Add(panelComplete);
            this.Controls.Add(panelInstalling);
        }

        private void BtnCopyPix_Click(object sender, EventArgs e)
        {
            try
            {
                Clipboard.SetText(txtPixKey.Text);
                btnCopyPix.Text = "✅ Copiado!";
                btnCopyPix.BackColor = ColorGreen;
            }
            catch
            {
                MessageBox.Show("Chave PIX: " + txtPixKey.Text, "Chave PIX", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void RunDiagnostic()
        {
            try
            {
                string curDir = AppDomain.CurrentDomain.BaseDirectory;
                string batPath = Path.Combine(curDir, "diagnostico.bat");
                if (File.Exists(batPath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = batPath,
                        WorkingDirectory = curDir,
                        UseShellExecute = true
                    });
                }
                else
                {
                    string ps1Path = Path.Combine(curDir, "diagnostico.ps1");
                    if (File.Exists(ps1Path))
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = "powershell.exe",
                            Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + ps1Path + "\"",
                            WorkingDirectory = curDir,
                            UseShellExecute = true
                        });
                    }
                    else
                    {
                        MessageBox.Show("Script diagnostico.bat não encontrado na pasta: " + curDir, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao disparar diagnóstico: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void StartInstallation()
        {
            hasError = false;
            isExtractDone = false;
            progressValue = 0;

            ThreadPool.QueueUserWorkItem(DoInstallWork);

            animTimer = new System.Windows.Forms.Timer();
            animTimer.Interval = 35;
            animTimer.Tick += AnimTimer_Tick;
            animTimer.Start();
        }

        private void AnimTimer_Tick(object sender, EventArgs e)
        {
            if (hasError)
            {
                animTimer.Stop();
                panelInstalling.Visible = false;
                panelComplete.Visible = false;
                panelError.Visible = true;
                return;
            }

            if (progressValue < 90 || isExtractDone)
            {
                progressValue += 2;
                if (progressValue > 100) progressValue = 100;

                progressBar.Value = progressValue;

                if (progressValue < 20)
                    lblStatus.Text = "📁 Verificando processos e preparando diretório...";
                else if (progressValue < 50)
                    lblStatus.Text = "📦 Extraindo executável otimizado do Discord Clone Leve...";
                else if (progressValue < 75)
                    lblStatus.Text = "📌 Criando atalho na Área de Trabalho...";
                else if (progressValue < 95)
                    lblStatus.Text = "✨ Ajustando permissões de execução e cache...";
                else if (progressValue >= 100 && isExtractDone)
                {
                    animTimer.Stop();
                    panelInstalling.Visible = false;
                    panelError.Visible = false;
                    panelComplete.Visible = true;
                }
            }
        }

        private void DoInstallWork(object state)
        {
            try
            {
                // 1. Fechar qualquer processo do aplicativo para evitar travamento de arquivo
                try
                {
                    foreach (var p in Process.GetProcessesByName("discord-clone-leve"))
                    {
                        try { p.Kill(); p.WaitForExit(3000); } catch { }
                    }
                }
                catch { }

                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "DiscordCloneLeve");
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                installedExePath = Path.Combine(installDir, "discord-clone-leve.exe");
                string iconPath = Path.Combine(installDir, "icon.ico");

                // 2. Extrair discord-clone-leve.exe
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("discord-clone-leve.exe"))
                {
                    if (stream == null)
                    {
                        throw new InvalidOperationException("O recurso nativo 'discord-clone-leve.exe' não foi localizado no instalador.");
                    }

                    using (FileStream fs = new FileStream(installedExePath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        stream.CopyTo(fs);
                    }
                }

                // 3. Validar se o executável existe e tem tamanho real de produção
                FileInfo fi = new FileInfo(installedExePath);
                if (!fi.Exists || fi.Length < 4000000)
                {
                    throw new IOException(string.Format("Arquivo extraído está incompleto ({0} bytes).", fi.Exists ? fi.Length : 0));
                }

                // 4. Extrair icon.ico
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (stream != null)
                    {
                        using (FileStream fs = new FileStream(iconPath, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            stream.CopyTo(fs);
                        }
                    }
                }

                // 5. Criar Atalho na Área de Trabalho
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktopPath, "Discord Clone Leve.lnk");

                CreateShortcut(shortcutPath, installedExePath, installDir, iconPath);

                // Delay suave para a experiência de instalação
                Thread.Sleep(1500);
            }
            catch (Exception ex)
            {
                hasError = true;
                string errDetails = "Tipo da Exceção: " + ex.GetType().FullName + "\n" +
                                   "Mensagem: " + ex.Message + "\n\n" +
                                   "Rastreamento de Pilha:\n" + ex.StackTrace;

                try
                {
                    string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    string logDir = Path.Combine(localAppData, "DiscordCloneLeve");
                    if (Directory.Exists(logDir))
                    {
                        File.WriteAllText(Path.Combine(logDir, "instalador_erro.log"), errDetails);
                    }
                }
                catch { }

                this.Invoke((MethodInvoker)delegate
                {
                    txtErrorDetails.Text = errDetails;
                });
            }
            finally
            {
                isExtractDone = true;
            }
        }

        private void CreateShortcut(string shortcutPath, string targetExe, string workingDir, string iconPath)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetExe;
                    shortcut.WorkingDirectory = workingDir;
                    shortcut.Description = "Discord Clone Leve — Comunicação em Tempo Real";
                    if (File.Exists(iconPath))
                    {
                        shortcut.IconLocation = iconPath + ",0";
                    }
                    shortcut.Save();
                }
            }
            catch { }
        }
    }

    // Controle customizado para barra de progresso suave com tema escuro
    public class CustomProgressBar : Control
    {
        private int _value = 0;
        public Color BarColor { get; set; }
        public Color BorderColor { get; set; }

        public int Value
        {
            get { return _value; }
            set
            {
                _value = Math.Max(0, Math.Min(100, value));
                Invalidate();
            }
        }

        public CustomProgressBar()
        {
            BarColor = Color.FromArgb(88, 101, 242);
            BorderColor = Color.FromArgb(60, 63, 69);
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = Color.FromArgb(43, 45, 49);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            using (Brush bgBrush = new SolidBrush(this.BackColor))
            {
                g.FillRectangle(bgBrush, 0, 0, this.Width, this.Height);
            }

            int fillWidth = (int)((this.Width * (float)_value) / 100f);
            if (fillWidth > 0)
            {
                using (Brush barBrush = new SolidBrush(BarColor))
                {
                    g.FillRectangle(barBrush, 0, 0, fillWidth, this.Height);
                }
            }

            using (Pen borderPen = new Pen(BorderColor, 1))
            {
                g.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
            }
        }
    }
}
