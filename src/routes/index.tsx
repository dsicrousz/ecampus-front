import { authClient } from '@/auth/auth-client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Form, Input, Button, Typography, Spin } from 'antd';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Mail, Lock, QrCode, ShieldCheck, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      throw redirect({ to: '/admin' });
    }
  },
  component: App,
});

function App() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await authClient.signIn.email({ email: values.email, password: values.password, callbackURL: '/admin' });
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
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex">
        {/* Left Panel - Hero Section */}
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-100 rounded-full blur-3xl opacity-40 translate-x-1/2 translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-100 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-16 w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3 mb-12">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                  <Utensils className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">E-Campus</h1>
                  <p className="text-slate-500 text-sm">CROUS de Ziguinchor</p>
                </div>
              </div>

              {/* Hero Text */}
              <div className="mb-12">
                <h2 className="text-5xl font-black text-slate-900 leading-tight mb-6">
                  La restauration<br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-teal-600">
                    universitaire
                  </span><br />
                  réinventée
                </h2>
                <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                  Simplifiez votre quotidien avec un système de tickets dématérialisés. 
                  Plus rapide, plus sécurisé, plus intelligent.
                </p>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-6 max-w-2xl">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shrink-0">
                        <benefit.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-1">{benefit.title}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">{benefit.desc}</p>
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
              transition={{ duration: 0.8, delay: 0.6 }}
              className="absolute bottom-8 left-16 text-slate-400 text-sm"
            >
              © {new Date().getFullYear()} CROUS de Ziguinchor - Université Assane Seck
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">E-Campus</h1>
                <p className="text-slate-500 text-xs">CROUS de Ziguinchor</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <Title level={2} className="mb-2! text-slate-900! font-bold!">
                  Bienvenue
                </Title>
                <Text className="text-slate-500">
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
                  label={<span className="text-slate-700 font-medium text-sm">Adresse email</span>}
                  rules={[
                    { required: true, message: 'Veuillez saisir votre email' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input
                    prefix={<Mail className="w-5 h-5 text-slate-400" />}
                    placeholder="etudiant@univ-zig.sn"
                    className="rounded-xl! py-3! border-slate-200! hover:border-blue-300"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-slate-700 font-medium text-sm">Mot de passe</span>}
                  rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
                >
                  <Input.Password
                    prefix={<Lock className="w-5 h-5 text-slate-400" />}
                    placeholder="Votre mot de passe"
                    className="rounded-xl! py-3! border-slate-200! hover:border-blue-300"
                  />
                </Form.Item>

                <Form.Item className="mt-6!">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    className="h-12! rounded-xl! bg-linear-to-r! from-blue-600! to-teal-600! border-none! font-semibold! text-base! hover:opacity-90! transition-opacity"
                    icon={<ArrowRight className="w-5 h-5" />}
                  >
                    Se connecter
                  </Button>
                </Form.Item>
              </Form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Connexion sécurisée</span>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 text-center">
              <Text className="text-slate-400 text-sm">
                Besoin d'aide ?{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
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
