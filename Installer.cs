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
        private Button btnClose;

        private int progressValue = 0;
        private string installedExePath = "";
        private bool isExtractDone = false;
        private string pixKey = "gui.antunes@live.com"; // Chave PIX do desenvolvedor

        public InstallerForm()
        {
            InitializeComponent();
            StartInstallation();
        }

        private void InitializeComponent()
        {
            this.Text = "Instalador — Discord Clone Leve";
            this.Size = new Size(580, 480);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = ColorBg;
            this.ForeColor = ColorText;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Tentar carregar ícone do form
            try
            {
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (stream != null)
                    {
                        this.Icon = new Icon(stream);
                    }
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

            // Logo / Ícone
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
                Location = new Point(40, 20),
                Size = new Size(500, 60)
            };

            Label lblSuccessTitle = new Label
            {
                Text = "Instalação Concluída com Sucesso!",
                Font = new Font("Segoe UI", 15f, FontStyle.Bold),
                ForeColor = ColorGreen,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 85),
                Size = new Size(500, 30)
            };

            Label lblThanks = new Label
            {
                Text = "Muito obrigado por instalar o Discord Clone Leve!\nO atalho oficial foi criado diretamente na sua Área de Trabalho.",
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                ForeColor = ColorText,
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(40, 120),
                Size = new Size(500, 42)
            };

            // Card do PIX
            Panel cardPix = new Panel
            {
                Location = new Point(45, 175),
                Size = new Size(490, 160),
                BackColor = ColorCard
            };

            Label lblPixTitle = new Label
            {
                Text = "❤️ Gostou do projeto? Considere apoiar com um PIX!",
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                ForeColor = ColorText,
                Location = new Point(16, 12),
                Size = new Size(458, 24)
            };

            Label lblPixDesc = new Label
            {
                Text = "Sua contribuição ajuda a manter os servidores de voz e o desenvolvimento contínuo ativo. Qualquer valor faz a diferença!",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                ForeColor = ColorMuted,
                Location = new Point(16, 38),
                Size = new Size(458, 32)
            };

            Label lblPixKeyLabel = new Label
            {
                Text = "Chave PIX (E-mail):",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = ColorMuted,
                Location = new Point(16, 75),
                Size = new Size(458, 18)
            };

            txtPixKey = new TextBox
            {
                Text = pixKey,
                Location = new Point(16, 96),
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
                Location = new Point(334, 94),
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
                Location = new Point(45, 360),
                Size = new Size(330, 44),
                BackColor = ColorGreen,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
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

            btnClose = new Button
            {
                Text = "Concluir",
                Location = new Point(390, 360),
                Size = new Size(145, 44),
                BackColor = ColorCard,
                ForeColor = ColorText,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.Click += (s, e) => Application.Exit();

            panelComplete.Controls.Add(lblSuccessIcon);
            panelComplete.Controls.Add(lblSuccessTitle);
            panelComplete.Controls.Add(lblThanks);
            panelComplete.Controls.Add(cardPix);
            panelComplete.Controls.Add(btnLaunch);
            panelComplete.Controls.Add(btnClose);

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

        private void StartInstallation()
        {
            // Thread de extração e instalação em segundo plano
            ThreadPool.QueueUserWorkItem(DoInstallWork);

            // Timer para animação da barra e textos
            animTimer = new System.Windows.Forms.Timer();
            animTimer.Interval = 40;
            animTimer.Tick += AnimTimer_Tick;
            animTimer.Start();
        }

        private void AnimTimer_Tick(object sender, EventArgs e)
        {
            if (progressValue < 90 || isExtractDone)
            {
                progressValue += 2;
                if (progressValue > 100) progressValue = 100;

                progressBar.Value = progressValue;

                if (progressValue < 25)
                    lblStatus.Text = "📁 Criando diretório de instalação em %LOCALAPPDATA%...";
                else if (progressValue < 55)
                    lblStatus.Text = "📦 Extraindo executável nativo do Discord Clone Leve...";
                else if (progressValue < 80)
                    lblStatus.Text = "📌 Criando atalho oficial na Área de Trabalho...";
                else if (progressValue < 98)
                    lblStatus.Text = "✨ Otimizando configurações e inicialização...";
                else if (progressValue >= 100 && isExtractDone)
                {
                    animTimer.Stop();
                    // Transição para tela de agradecimento
                    panelInstalling.Visible = false;
                    panelComplete.Visible = true;
                }
            }
        }

        private void DoInstallWork(object state)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "DiscordCloneLeve");
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                installedExePath = Path.Combine(installDir, "discord-clone-leve.exe");
                string iconPath = Path.Combine(installDir, "icon.ico");

                // 1. Extrair discord-clone-leve.exe
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("discord-clone-leve.exe"))
                {
                    if (stream != null)
                    {
                        using (FileStream fs = new FileStream(installedExePath, FileMode.Create, FileAccess.Write))
                        {
                            stream.CopyTo(fs);
                        }
                    }
                }

                // 2. Extrair icon.ico
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (stream != null)
                    {
                        using (FileStream fs = new FileStream(iconPath, FileMode.Create, FileAccess.Write))
                        {
                            stream.CopyTo(fs);
                        }
                    }
                }

                // 3. Criar Atalho na Área de Trabalho
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktopPath, "Discord Clone Leve.lnk");

                CreateShortcut(shortcutPath, installedExePath, installDir, iconPath);

                // Pequeno delay para a animação ser visualmente agradável
                Thread.Sleep(2000);
            }
            catch (Exception ex)
            {
                this.Invoke((MethodInvoker)delegate
                {
                    lblStatus.Text = "Erro na instalação: " + ex.Message;
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

            // Fundo
            using (Brush bgBrush = new SolidBrush(this.BackColor))
            {
                g.FillRectangle(bgBrush, 0, 0, this.Width, this.Height);
            }

            // Barra preenchida
            int fillWidth = (int)((this.Width * (float)_value) / 100f);
            if (fillWidth > 0)
            {
                using (Brush barBrush = new SolidBrush(BarColor))
                {
                    g.FillRectangle(barBrush, 0, 0, fillWidth, this.Height);
                }
            }

            // Borda
            using (Pen borderPen = new Pen(BorderColor, 1))
            {
                g.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
            }
        }
    }
}
