import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

export const directoryRouter = router({
  // ============================================================================
  // DIRECTORY MEMBERS
  // ============================================================================

  listMembers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      // Use the database function that respects privacy settings
      let queryText = `
        SELECT *
        FROM get_directory_members($1::uuid)
      `;

      if (search) {
        queryText += `
          WHERE LOWER(first_name) LIKE $2
             OR LOWER(last_name) LIKE $2
             OR LOWER(email) LIKE $2
        `;
      }

      queryText += ` ORDER BY last_name, first_name LIMIT $${search ? 3 : 2} OFFSET $${search ? 4 : 3}`;

      const params = search
        ? [tenantId, `%${search.toLowerCase()}%`, limit, offset]
        : [tenantId, limit, offset];

      const result = await queryWithTenant(tenantId, queryText, params);

      // Count total
      let countQuery = `
        SELECT COUNT(*) as total
        FROM get_directory_members($1::uuid)
      `;

      if (search) {
        countQuery += `
          WHERE LOWER(first_name) LIKE $2
             OR LOWER(last_name) LIKE $2
             OR LOWER(email) LIKE $2
        `;
      }

      const countParams = search ? [tenantId, `%${search.toLowerCase()}%`] : [tenantId];
      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        members: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  getMember: protectedProcedure
    .input(z.object({ personId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get person details
      const personResult = await queryWithTenant(
        tenantId,
        `SELECT * FROM person WHERE id = $1 AND deleted_at IS NULL`,
        [input.personId]
      );

      if (personResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Person not found' });
      }

      const person = personResult.rows[0];

      // Get directory settings
      const settingsResult = await queryWithTenant(
        tenantId,
        `SELECT * FROM directory_settings WHERE person_id = $1`,
        [input.personId]
      );

      const settings = settingsResult.rows[0] || {
        show_in_directory: true,
        show_email: true,
        show_phone: true,
        show_address: false,
        show_birthday: false,
        show_photo: true,
      };

      // Apply privacy filters
      return {
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
        email: settings.show_email ? person.email : null,
        phone: settings.show_phone ? person.phone : null,
        address: settings.show_address ? person.address : null,
        city: settings.show_address ? person.city : null,
        state: settings.show_address ? person.state : null,
        zip_code: settings.show_address ? person.zip_code : null,
        birthday: settings.show_birthday ? person.birthday : null,
        photo_url: settings.show_photo ? person.photo_url : null,
        membership_status: person.membership_status,
        privacy_settings: settings,
      };
    }),

  // ============================================================================
  // DIRECTORY SETTINGS
  // ============================================================================

  getSettings: protectedProcedure
    .input(z.object({ personId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      const personId = input.personId || ctx.userId;
      const tenantId = ctx.tenantId!;

      if (!personId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Person ID required' });
      }

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM directory_settings WHERE person_id = $1`,
        [personId]
      );

      // Return default settings if not found
      if (result.rows.length === 0) {
        return {
          person_id: personId,
          show_in_directory: true,
          show_email: true,
          show_phone: true,
          show_address: false,
          show_birthday: false,
          show_photo: true,
          allow_email_contact: true,
          allow_phone_contact: true,
          allow_text_contact: true,
        };
      }

      return result.rows[0];
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        showInDirectory: z.boolean().optional(),
        showEmail: z.boolean().optional(),
        showPhone: z.boolean().optional(),
        showAddress: z.boolean().optional(),
        showBirthday: z.boolean().optional(),
        showPhoto: z.boolean().optional(),
        allowEmailContact: z.boolean().optional(),
        allowPhoneContact: z.boolean().optional(),
        allowTextContact: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const personId = input.personId || ctx.userId;
      const tenantId = ctx.tenantId!;

      if (!personId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Person ID required' });
      }

      const { personId: _, ...updateData } = input;

      // Check if settings exist
      const existing = await queryWithTenant(
        tenantId,
        `SELECT id FROM directory_settings WHERE person_id = $1`,
        [personId]
      );

      if (existing.rows.length > 0) {
        // Update existing settings
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updateData.showInDirectory !== undefined) {
          setClauses.push(`show_in_directory = $${paramIndex++}`);
          values.push(updateData.showInDirectory);
        }
        if (updateData.showEmail !== undefined) {
          setClauses.push(`show_email = $${paramIndex++}`);
          values.push(updateData.showEmail);
        }
        if (updateData.showPhone !== undefined) {
          setClauses.push(`show_phone = $${paramIndex++}`);
          values.push(updateData.showPhone);
        }
        if (updateData.showAddress !== undefined) {
          setClauses.push(`show_address = $${paramIndex++}`);
          values.push(updateData.showAddress);
        }
        if (updateData.showBirthday !== undefined) {
          setClauses.push(`show_birthday = $${paramIndex++}`);
          values.push(updateData.showBirthday);
        }
        if (updateData.showPhoto !== undefined) {
          setClauses.push(`show_photo = $${paramIndex++}`);
          values.push(updateData.showPhoto);
        }
        if (updateData.allowEmailContact !== undefined) {
          setClauses.push(`allow_email_contact = $${paramIndex++}`);
          values.push(updateData.allowEmailContact);
        }
        if (updateData.allowPhoneContact !== undefined) {
          setClauses.push(`allow_phone_contact = $${paramIndex++}`);
          values.push(updateData.allowPhoneContact);
        }
        if (updateData.allowTextContact !== undefined) {
          setClauses.push(`allow_text_contact = $${paramIndex++}`);
          values.push(updateData.allowTextContact);
        }

        if (setClauses.length > 0) {
          values.push(personId);
          const result = await queryWithTenant(
            tenantId,
            `UPDATE directory_settings SET ${setClauses.join(', ')} WHERE person_id = $${paramIndex} RETURNING id`,
            values
          );

          return result.rows[0];
        }

        return existing.rows[0];
      } else {
        // Create new settings
        const result = await queryWithTenant(
          tenantId,
          `INSERT INTO directory_settings
            (person_id, show_in_directory, show_email, show_phone, show_address, show_birthday, show_photo, allow_email_contact, allow_phone_contact, allow_text_contact)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            personId,
            updateData.showInDirectory ?? true,
            updateData.showEmail ?? true,
            updateData.showPhone ?? true,
            updateData.showAddress ?? false,
            updateData.showBirthday ?? false,
            updateData.showPhoto ?? true,
            updateData.allowEmailContact ?? true,
            updateData.allowPhoneContact ?? true,
            updateData.allowTextContact ?? true,
          ]
        );

        return result.rows[0];
      }
    }),

  // ============================================================================
  // BULK EXPORT
  // ============================================================================

  exportDirectory: protectedProcedure
    .input(
      z.object({
        format: z.enum(['csv', 'json']).default('csv'),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get all directory members
      const result = await queryWithTenant(
        tenantId,
        `SELECT id, first_name, last_name, email, phone, membership_status
         FROM get_directory_members($1::uuid)
         ORDER BY last_name, first_name`,
        [tenantId]
      );

      const members = result.rows;

      if (input.format === 'csv') {
        // Generate CSV
        const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Membership Status'];
        const rows = members.map((m: any) => [
          m.first_name,
          m.last_name,
          m.email || '',
          m.phone || '',
          m.membership_status,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        return { format: 'csv', data: csv };
      } else {
        // Return JSON
        return { format: 'json', data: JSON.stringify(members, null, 2) };
      }
    }),
});
