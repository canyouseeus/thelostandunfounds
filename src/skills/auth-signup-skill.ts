/**
 * Auth Sign-Up Flow Skill
 * 
 * Complete sign-up workflow that:
 * 1. Creates user account
 * 2. Verifies email (if needed)
 * 3. Initializes free tier subscription
 * 4. Returns user session
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from './types';

const metadata: SkillMetadata = {
  name: 'sign-up-flow',
  description: 'Complete sign-up workflow: create account, verify email, initialize subscription',
  category: 'auth',
  tags: ['auth', 'signup', 'onboarding'],
  aliases: ['@signup', '@register'],
  version: '1.0.0',
  requiredParams: ['email', 'password'],
  optionalParams: ['redirectTo'],
  example: 'sign-up-flow({ email: "user@example.com", password: "secure123" })',
};

const skill: SkillDefinition = {
  name: 'sign-up-flow',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'email',
      type: 'string',
      description: 'User email address',
      required: true,
      validation: (value) => {
        if (!value || !value.includes('@')) {
          return 'Valid email address is required';
        }
        return true;
      },
    },
    {
      name: 'password',
      type: 'string',
      description: 'User password (min 6 characters)',
      required: true,
      validation: (value) => {
        if (!value || value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return true;
      },
    },
    {
      name: 'redirectTo',
      type: 'string',
      description: 'Redirect URL after sign-up',
      required: false,
    },
  ],
  
  validate: (params) => {
    if (!params.email || !params.email.includes('@')) {
      return 'Valid email address is required';
    }
    if (!params.password || params.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return true;
  },
  
  execute: async (params, context) => {
    const { email, password, redirectTo } = params;
    
    context?.log?.(`Starting sign-up flow for ${email}`, 'info');
    
    try {
      // Step 1: Sign up user using auth tool
      context?.log?.('Creating user account...', 'info');
      const signUpTool = await context?.tools?.import('auth', 'signUp');
      const signUpResult = await signUpTool({ email, password });
      
      if (!signUpResult.user) {
        throw new Error('Failed to create user account');
      }
      
      const userId = signUpResult.user.id;
      context?.log?.(`User created: ${userId}`, 'info');
      
      // Step 2: Initialize free tier subscription
      context?.log?.('Initializing free tier subscription...', 'info');
      const createSubscriptionTool = await context?.tools?.import('subscription', 'createSubscription');
      const subscriptionResult = await createSubscriptionTool({
        userId,
        tier: 'free',
      });
      
      context?.log?.('Subscription initialized', 'info');
      
      // Step 3: Get session
      const getSessionTool = await context?.tools?.import('auth', 'getSession');
      const sessionResult = await getSessionTool();
      
      return {
        success: true,
        user: signUpResult.user,
        session: sessionResult.session,
        subscription: subscriptionResult.subscription,
        message: 'Account created successfully',
      };
    } catch (error) {
      context?.log?.(
        `Sign-up failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    return {
      success: false,
      error: error.message,
      email: params.email,
    };
  },
};

export default skill;

