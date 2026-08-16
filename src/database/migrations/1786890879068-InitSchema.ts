import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1786890879068 implements MigrationInterface {
    name = 'InitSchema1786890879068'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channel" character varying NOT NULL, "external_id" character varying NOT NULL, "display_name" character varying, "username" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d38449c9ae92bb0b09bfb667e5" ON "contacts"  ("channel", "external_id") `);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contact_id" uuid NOT NULL, "channel" character varying NOT NULL, "direction" character varying NOT NULL, "text" text, "external_id" character varying NOT NULL, "payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f0d46f686bcb22c2be06fb92f8" ON "messages"  ("channel", "external_id") `);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_d109211ed510ef10617c5e75927" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_d109211ed510ef10617c5e75927"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0d46f686bcb22c2be06fb92f8"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d38449c9ae92bb0b09bfb667e5"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
    }

}
