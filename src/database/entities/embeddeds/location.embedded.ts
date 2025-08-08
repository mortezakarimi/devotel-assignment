import { Column, Index } from 'typeorm';

export class Location {
  @Index()
  @Column({ nullable: true })
  city: string;

  @Index()
  @Column({ nullable: true })
  state: string;
}
