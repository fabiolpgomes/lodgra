/**
 * Tests for WhatsApp Template Manager (Story 30.2)
 */

import { describe, it, expect } from '@jest/globals';
import {
  getDefaultTemplate,
  extractVariables,
  validateRequiredVariables,
} from '@/lib/whatsapp/default-templates';

describe('Story 30.2 — WhatsApp Template Manager', () => {
  describe('Default Templates', () => {
    it('should retrieve PT-BR default template', () => {
      const template = getDefaultTemplate('checkin_code', 'pt-BR');
      expect(template).toBeDefined();
      expect(template).toContain('{{property_name}}');
      expect(template).toContain('{{property_address}}');
    });

    it('should retrieve ES default template', () => {
      const template = getDefaultTemplate('checkin_code', 'es');
      expect(template).toBeDefined();
      expect(template?.toLowerCase()).toContain('hola');
    });

    it('should return null for unknown template', () => {
      const template = getDefaultTemplate('unknown_template', 'pt-BR');
      expect(template).toBeNull();
    });
  });

  describe('Variable Extraction (AC3)', () => {
    it('should extract all variables from template', () => {
      const template = 'Olá {{guest_name}}, bem-vindo a {{property_name}} em {{property_address}}';
      const vars = extractVariables(template);
      expect(vars).toContain('{{guest_name}}');
      expect(vars).toContain('{{property_name}}');
      expect(vars).toContain('{{property_address}}');
    });

    it('should handle no variables', () => {
      const template = 'Just a plain message';
      const vars = extractVariables(template);
      expect(vars).toHaveLength(0);
    });

    it('should handle duplicate variables', () => {
      const template = '{{property_name}} at {{property_address}} is {{property_name}} again';
      const vars = extractVariables(template);
      expect(vars.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Required Variables Validation (AC2, AC10)', () => {
    it('should pass validation with required variables', () => {
      const template = `Bem-vindo a {{property_name}} em {{property_address}}`;
      const validation = validateRequiredVariables(template);
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    it('should fail if property_name missing', () => {
      const template = 'Bem-vindo em {{property_address}}';
      const validation = validateRequiredVariables(template);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('{{property_name}}');
    });

    it('should fail if property_address missing', () => {
      const template = 'Bem-vindo a {{property_name}}';
      const validation = validateRequiredVariables(template);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('{{property_address}}');
    });

    it('should fail if both required variables missing', () => {
      const template = 'Just a plain message';
      const validation = validateRequiredVariables(template);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toHaveLength(2);
    });
  });

  describe('Preview Generation (AC3)', () => {
    it('should generate preview with variable substitution', () => {
      const template = 'Hello {{guest_name}} at {{property_name}}';
      const variables = extractVariables(template);
      expect(variables).toContain('{{guest_name}}');
      expect(variables).toContain('{{property_name}}');
    });

    it('should handle special characters in variables', () => {
      const template = 'Code: {{checkin_code}} (special: !@#$)';
      const vars = extractVariables(template);
      expect(vars).toContain('{{checkin_code}}');
    });
  });
});
