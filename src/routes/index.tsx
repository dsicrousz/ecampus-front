import { authClient } from '@/auth/auth-client';
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Form, Input, Button, Typography, Spin } from 'antd';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Mail, Lock, QrCode, Ticket, Users, ShieldCheck } from 'lucide-react';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
   const session = await  authClient.getSession()
    if (session.data?.user) {
      throw redirect({to: '/admin'})
    }
  },
  component: App,
})

function App() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
    await authClient.signIn.email({ email: values.email, password: values.password,callbackURL:'/admin' });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: QrCode, title: 'QR Code', desc: 'Tickets dématérialisés' },
    { icon: Ticket, title: 'Simple', desc: 'Achat en quelques clics' },
    { icon: Users, title: 'Accessible', desc: 'Pour tous les étudiants' },
    { icon: ShieldCheck, title: 'Sécurisé', desc: 'Transactions protégées' },
  ];

  return (
    <Spin spinning={loading}>
      <div className="min-h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-600 via-blue-700 to-teal-800 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            {/* Logo & Title */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Utensils className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">E-Campus</h1>
                  <p className="text-blue-100 text-sm">CROUS de Ziguinchor</p>
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                  La restauration<br />universitaire<br />
                  <span className="text-blue-200">simplifiée</span>
                </h2>
                <p className="text-blue-100 text-lg max-w-md">
                  Dématérialisez vos tickets restaurant et profitez d'une expérience moderne et rapide au restaurant universitaire.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  >
                    <feature.icon className="w-6 h-6 text-blue-200 mb-2" />
                    <h3 className="text-white font-semibold">{feature.title}</h3>
                    <p className="text-blue-100 text-sm">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-blue-200 text-sm"
            >
              © {new Date().getFullYear()} CROUS de Ziguinchor - Université Assane Seck
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">E-Campus</h1>
                <p className="text-gray-500 text-xs">CROUS de Ziguinchor</p>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
              <div className="text-center mb-8">
                <Title level={2} className="mb-2! text-gray-800!">
                  Connexion
                </Title>
                <Text className="text-gray-500">
                  Accédez à votre espace E-Campus
                </Text>
              </div>

              <Form
                form={form}
                name="login"
                onFinish={onFinish}
                layout="vertical"
                size="large"
                className="space-y-1"
              >
                <Form.Item
                  name="email"
                  label={<span className="text-gray-700 font-medium">Adresse email</span>}
                  rules={[
                    { required: true, message: 'Veuillez saisir votre email' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input
                    prefix={<Mail className="w-4 h-4 text-gray-400 mr-2" />}
                    placeholder="etudiant@univ-zig.sn"
                    className="rounded-xl! py-3!"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-gray-700 font-medium">Mot de passe</span>}
                  rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
                >
                  <Input.Password
                    prefix={<Lock className="w-4 h-4 text-gray-400 mr-2" />}
                    placeholder="Votre mot de passe"
                    className="rounded-xl! py-3!"
                  />
                </Form.Item>

                <Form.Item className="mt-6!">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    className="h-12! rounded-xl! bg-blue-600! hover:bg-blue-700! border-none! font-semibold! text-base!"
                  >
                    Se connecter
                  </Button>
                </Form.Item>
              </Form>
            </div>

            {/* Help Section */}
            <div className="mt-6 text-center">
              <Text className="text-gray-400 text-sm">
                Besoin d'aide ?{' '}
                <Link href="#" className="text-gray-500! hover:text-blue-600!">
                  support@crous-ziguinchor.sn
                </Link>
              </Text>
            </div>
          </motion.div>
        </div>
      </div>
    </Spin>
  )
}
