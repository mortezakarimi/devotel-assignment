import { Column, Entity, Index } from 'typeorm';

@Entity('companies')
export class Salary {
  @Index()
  @Column({ type: 'integer', nullable: true })
  min: number;

  @Index()
  @Column({ type: 'integer', nullable: true })
  max: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;
}
