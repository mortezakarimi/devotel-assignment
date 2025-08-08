import { Column, Index } from 'typeorm';

export class Provider {
  @Index()
  @Column()
  name: string;

  @Index()
  @Column()
  jobId: string;
}
