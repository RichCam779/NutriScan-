import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrincipalPageComponent } from './principal-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PrincipalPageComponent', () => {
  let component: PrincipalPageComponent;
  let fixture: ComponentFixture<PrincipalPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
