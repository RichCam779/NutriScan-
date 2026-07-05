import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AcercaPageComponent } from './acerca-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AcercaPageComponent', () => {
  let component: AcercaPageComponent;
  let fixture: ComponentFixture<AcercaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcercaPageComponent],
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

    fixture = TestBed.createComponent(AcercaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should make component visible after delay', fakeAsync(() => {
    component.ngOnInit();
    tick(50);
    expect(component.visible).toBeTrue();
  }));
});
