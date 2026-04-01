import { Card, Form, Input, Button, Typography, Divider, Space, Row, Col } from 'antd';
import { useState } from 'react';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      console.log('Login values:', values);
      // Add your login logic here
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card className="overflow-hidden">
        <Row gutter={0}>
          <Col xs={24} md={12}>
            <div style={{ padding: '32px' }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={2}>Bienvenue</Title>
                  <Text type="secondary">
                    Connectez-vous à votre compte E-Campus
                  </Text>
                </div>

                <Form
                  form={form}
                  name="login"
                  onFinish={onFinish}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Veuillez saisir votre email' },
                      { type: 'email', message: 'Email invalide' }
                    ]}
                  >
                    <Input
                      placeholder="m@example.com"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Mot de passe</span>
                        <Link href="#" style={{ fontSize: '14px' }}>
                          Mot de passe oublié ?
                        </Link>
                      </div>
                    }
                    rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
                  >
                    <Input.Password
                      placeholder="Votre mot de passe"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                    >
                      Se connecter
                    </Button>
                  </Form.Item>
                </Form>

                <Divider plain>Ou continuer avec</Divider>

                <Row gutter={8}>
                  <Col span={8}>
                    <Button
                      block
                      onClick={() => console.log('Apple login')}
                    >
                      Apple
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button
                      block
                      onClick={() => console.log('Google login')}
                    >
                      Google
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button
                      block
                      onClick={() => console.log('Meta login')}
                    >
                      Meta
                    </Button>
                  </Col>
                </Row>
              </Space>
            </div>
          </Col>
          <Col xs={0} md={12}>
            <div
              style={{
                height: '100%',
                minHeight: '500px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/placeholder.svg"
                alt="Login illustration"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.3,
                }}
              />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
