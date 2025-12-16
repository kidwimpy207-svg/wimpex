const nodemailer = require('nodemailer');
const config = require('../config');
const crypto = require('crypto');

let transporter = null;

// Initialize SMTP transporter
const initTransporter = () => {
  if (config.smtp && config.smtp.host && config.smtp.user) {
    try {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port || 587,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
      console.log('✉️ Email service initialized');
    } catch (err) {
      console.warn('⚠️ Email service failed:', err.message);
    }
  } else {
    console.log('⚠️ SMTP not configured; emails will be logged only');
  }
};

// Send email
const sendEmail = async (to, subject, html, text) => {
  if (!transporter) {
    console.log(`[EMAIL LOG] To: ${to}, Subject: ${subject}`);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    await transporter.sendMail({
      from: config.smtp?.from || 'noreply@wimpex.local',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    });
    console.log(`✓ Email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('✗ Email send failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Generate verification token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Email templates
const templates = {
  verifyEmail: (username, token, verifyUrl) => ({
    subject: 'Verify Your Wimpex Email',
    html: `
      <h2>Welcome to Wimpex, ${username}!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}?token=${token}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Or paste this token: <code>${token}</code></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Verify your email by visiting: ${verifyUrl}?token=${token}`,
  }),

  resetPassword: (username, token, resetUrl) => ({
    subject: 'Reset Your Wimpex Password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${username},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}?token=${token}" style="padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>Or paste this token: <code>${token}</code></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
    text: `Reset your password by visiting: ${resetUrl}?token=${token}`,
  }),

  welcomeEmail: (username) => ({
    subject: 'Welcome to Wimpex! 🎉',
    html: `
      <h2>Welcome, ${username}!</h2>
      <p>Your account is all set. Start creating, sharing, and connecting with the world!</p>
      <a href="https://wimpex.app/" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Go to Wimpex
      </a>
    `,
    text: 'Welcome to Wimpex! Visit https://wimpex.app/ to get started.',
  }),
};

// Send verification email
const sendVerificationEmail = async (email, username, token) => {
  const verifyUrl = `${config.appUrl || 'http://localhost:3000'}/verify-email`;
  const template = templates.verifyEmail(username, token, verifyUrl);
  return sendEmail(email, template.subject, template.html, template.text);
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${config.appUrl || 'http://localhost:3000'}/reset-password`;
  const template = templates.resetPassword(username, token, resetUrl);
  return sendEmail(email, template.subject, template.html, template.text);
};

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  const template = templates.welcomeEmail(username);
  return sendEmail(email, template.subject, template.html, template.text);
};

initTransporter();

module.exports = {
  sendEmail,
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
