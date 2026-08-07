import { authClient, type Session } from '@/auth/auth-client';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Form, Input, Button, Typography, Spin } from 'antd';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, QrCode, ShieldCheck, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react';
import { getRoleHomeRoute } from '@/lib/route-protection';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const user = session.data?.user as Session['user'] | undefined;
    if (user) {
      throw redirect({ to: getRoleHomeRoute(user.role) });
    }
  },
  component: App,
});

function App() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const { data } = await authClient.signIn.email({ email: values.email, password: values.password });
      const user = data?.user as Session['user'] | undefined;
      if (user) {
        navigate({ to: getRoleHomeRoute(user.role) });
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: QrCode, title: 'Tickets QR Code', desc: 'Scannez et consommez instantanément' },
    { icon: Clock, title: 'Gain de temps', desc: 'Plus de files d\'attente' },
    { icon: ShieldCheck, title: '100% Sécurisé', desc: 'Transactions cryptées et protégées' },
    { icon: Zap, title: 'Rapide', desc: 'Achat en quelques secondes' },
  ];

  return (
    <Spin spinning={loading}>
      <div className="min-h-screen bg-background flex">
        {/* Left Panel - Hero Section */}
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-primary text-primary-foreground">
          {/* Decorative geometric blocks (flat, no gradients) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[420px] h-[420px] border border-white/10 rounded-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[320px] h-[320px] border border-white/10 rounded-2xl translate-y-1/3 -translate-x-1/4" />
            <div className="absolute top-1/3 left-1/2 w-[180px] h-[180px] bg-white/5 rounded-2xl rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-16 w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3 mb-10">
               <img src="/logo_vert_bleu.png" alt="Logo" width="35%" />
              </div>

              {/* Hero Text */}
              <div className="mb-8">
                <h2 className="text-5xl font-black text-white leading-tight mb-6">
                  La restauration<br />
                  <span className="text-secondary">universitaire</span><br />
                  réinventée
                </h2>
                <p className="text-lg text-white/80 max-w-xl leading-relaxed">
                  Simplifiez votre quotidien avec un système de tickets dématérialisés.
                  Plus rapide, plus sécurisé, plus intelligent.
                </p>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                    className="bg-white/10 rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                        <benefit.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm mb-1">{benefit.title}</h3>
                        <p className="text-white/70 text-xs leading-relaxed">{benefit.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute bottom-8 left-16 text-white/60 text-sm"
            >
              © {new Date().getFullYear()} CROUS de Ziguinchor - Université Assane Seck
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-background">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex items-center justify-center gap-3">
               <img src="/logo_vert_bleu.png" alt="Logo" width="45%" />
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-card rounded-2xl border border-border p-10">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary-foreground" />
                </div>
                <Title level={2} className="mb-2! text-foreground! font-bold!">
                  Bienvenue
                </Title>
                <Text className="text-muted-foreground">
                  Connectez-vous à votre espace
                </Text>
              </div>

              <Form
                form={form}
                name="login"
                onFinish={onFinish}
                layout="vertical"
                size="large"
                className="space-y-2"
              >
                <Form.Item
                  name="email"
                  label={<span className="text-foreground font-medium text-sm">Adresse email</span>}
                  rules={[
                    { required: true, message: 'Veuillez saisir votre email' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input
                    prefix={<Mail className="w-5 h-5 text-muted-foreground" />}
                    placeholder="etudiant@univ-zig.sn"
                    className="rounded-xl! py-3! border-border! hover:border-primary"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-foreground font-medium text-sm">Mot de passe</span>}
                  rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
                >
                  <Input.Password
                    prefix={<Lock className="w-5 h-5 text-muted-foreground" />}
                    placeholder="Votre mot de passe"
                    className="rounded-xl! py-3! border-border! hover:border-primary"
                  />
                </Form.Item>

                <Form.Item className="mt-6!">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    className="h-12! rounded-xl! bg-primary! border-none! font-semibold! text-base! hover:opacity-90! transition-opacity"
                    icon={<ArrowRight className="w-5 h-5" />}
                  >
                    Se connecter
                  </Button>
                </Form.Item>
              </Form>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Connexion sécurisée</span>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 text-center">
              <Text className="text-muted-foreground text-sm">
                Besoin d'aide ?{' '}
                <Link href="#" className="text-primary hover:opacity-80 font-medium">
                  Contactez le support
                </Link>
              </Text>
            </div>
          </motion.div>
        </div>
      </div>
    </Spin>
  );
}
